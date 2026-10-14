# Modernisierungsplan: New Architecture, Swift & Wartbarkeit

Bestandsaufnahme vom 2026-09-27, Stand `v1.0.103` (Commit `bae706b`).

Analysiert wurden: JS-Layer (`VLCPlayer.js`, `playerView/`), Android-Java
(`android/src/main/java/com/yuanzhou/vlc/`), iOS-ObjC (`ios/RCTVLCPlayer/`),
`react-native-vlc-media-player.podspec`, `android/build.gradle`, Expo-Plugin
(`expo/`) und die GitHub-Workflows.

## Leitentscheidungen

1. **RN Codegen**, nicht Expo Modules API (Begründung: Abschnitt 5).
2. **Swift** für die iOS-Player-Logik, **Kotlin** für Android. Beides
   verbindlich, aber mit unterschiedlichem Risikoprofil: iOS ist ein Rewrite
   mit Umstrukturierung, Android eine werkzeuggestützte Konversion. Deshalb
   getrennt sequenziert (Phase 2b bzw. 2c).
3. **Old Architecture wird weiter unterstützt** — aber strikt isoliert, sodass
   der Ausbau später ein Löschvorgang ist und kein Umbau (Abschnitt 4).
4. Damit ist der Umbau **kein Breaking Change**: die öffentliche JS-API bleibt
   signaturgleich, nur der Transportweg darunter wechselt. Release als `1.x`
   möglich, Major erst bei Phase 5 (VLCKit 4).

---

## 1. Blocker für die New Architecture

Das sind keine Kosmetikpunkte: Unter Bridgeless/Fabric bricht der Player an
diesen Stellen funktional.

| Stelle | Problem |
| --- | --- |
| `VLCPlayer.js:73-85`, `:129` | `seek()`, `resume()`, `autoAspectRatio()`, `changeVideoAspectRatio()` und `_onStopped()` laufen über `setNativeProps`. Fabric-Komponenten unterstützen das nicht — die gesamte imperative API ist damit tot. |
| `VLCPlayer.js:40-65` | `UIManager.dispatchViewManagerCommand` + `findNodeHandle`; muss auf `codegenNativeCommands` umgestellt werden. |
| `VideoEventEmitter.java:24` | `reactContext.getJSModule(RCTEventEmitter.class)` existiert im Bridgeless-Modus nicht. **Alle** Events brechen. |
| `ReactVlcPlayerViewManager.java:178`, `:187` | `getCommandsMap()` mit int-IDs und `receiveCommand(view, int, args)`. Die int-Variante ist entfernt; New Arch dispatcht String-IDs. |
| `RCTVLCPlayerManager.m:53-97` | `RCT_EXPORT_METHOD` mit `reactTag` + `self.bridge.uiManager.addUIBlock`. `bridge` ist unter Bridgeless nicht verfügbar → Recording, Snapshot und `stopPlayer` brechen auf iOS komplett. |
| `VLCPlayer.js:294` | `requireNativeComponent` ohne Codegen-Spec: keine View-Config, keine Typprüfung. |
| `VLCPlayer.js:7` | Deep-Import von `react-native/Libraries/Image/resolveAssetSource` (private API, verschiebt sich zwischen RN-Versionen). Öffentlich ist `Image.resolveAssetSource`. |

### Die Interop-Layer rettet das nicht

Legacy-ViewManager laufen teilweise über die Native-Interop-Layer weiter, aber
genau die drei hier benutzten Mechanismen — `setNativeProps`,
`uiManager.addUIBlock` und `RCTEventEmitter` — kommen nicht mit. Der direkte Weg
zu Codegen ist deshalb billiger als der Zwischenschritt über Interop.

---

## 2. Wartbarkeits-Schulden

### Prozess
- **Keine Beispiel-App, keine Tests, kein Lint, kein Build.** `npmpublish.yml`
  macht bei jedem Push auf `master` `npm version patch` + `npm publish` — ohne
  einen einzigen Verifikationsschritt. Das erklärt 344 Commits bei Version
  1.0.103. PRs sind praktisch nicht reviewbar, weil sich nichts starten lässt.

### Konsistenz
- `index.d.ts` (7 KB) ist handgepflegt und driftet zwangsläufig von
  `VLCPlayer.js` weg.
- Versionen an drei Stellen uneinheitlich: `podspec:3` sagt `1.0.38`,
  `package.json` sagt `1.0.103`.
- VLC-Version dreifach gepinnt: `3.5.1` im Podspec, `3.3.10` in
  `expo/ios/withMobileVlcKit.js`, `3.6.3` in `android/build.gradle`.

### Package-Metadaten
- `react-native-slider` (seit ~2018 unmaintained/deprecated) und
  `react-native-vector-icons@9` stehen in `dependencies`. Jeder Konsument zieht
  sie mit, obwohl sie nur für das optionale `VlCPlayerView`-Control-UI nötig
  sind.
- `peerDependencies` für `react` / `react-native` fehlen ganz.
- Kein `files`-Feld → `.idea/`, `.github/`, `package-lock.json` und iOS-
  `xcuserdata` landen im npm-Tarball.

### Android-Build
- `buildscript`-Block mit AGP `4.0.2` *innerhalb* der Library
  (`android/build.gradle:21-32`).
- Gradle Wrapper 6.9.
- `com.facebook.react:react-native:+` — Dynamic Version auf ein Artefakt, das
  nicht mehr existiert; heute `react-android` über das RN-Gradle-Plugin.
- `androidx.legacy:legacy-support-v4`.
- Als Maven-Repo ist `https://mvnrepository.com/artifact/org.videolan.android`
  eingetragen. Das ist eine Suchmaschinen-URL, kein Maven-Repo — der Eintrag ist
  wirkungslos.

### iOS-Build
- `s.ios.deployment_target = "8.4"`, `s.tvos.deployment_target = "10.2"`.
- `s.dependency 'React'` statt `install_modules_dependencies(s)`.
- Kein `s.swift_version` (Voraussetzung für Phase 2).

### Kleinere Bugs
- `VLCPlayer.js:160` ruft `this.props.onRecordingCreated(...)` ungeprüft auf →
  Crash, wenn das Prop fehlt.
- Events sind in `RCTVLCPlayer.h` als `RCTBubblingEventBlock` deklariert, im
  Manager aber als `RCTDirectEventBlock` exportiert.

---

## 3. Architekturprinzip: Core + Adapter

Das ist die tragende Entscheidung für alles Weitere. Jede Plattform wird in zwei
Schichten geteilt:

```
JS          VlcPlayerViewNativeComponent.ts   ← eine Spec, arch-agnostisch
                          |
iOS         VlcPlayerView.swift               ← Core: VLC-Logik, kennt RN nicht
            ├── VlcPlayerComponentView.mm     ← Adapter New Arch  (löschbar: nein)
            └── RCTVLCPlayerManager.m         ← Adapter Old Arch  (löschbar: JA)

Android     VlcPlayerView.kt                  ← Core: VLC-Logik
            VlcPlayerViewManager.kt           ← ein Manager für beide
            ├── src/newarch/…ManagerSpec.kt   ← Adapter New Arch  (löschbar: nein)
            └── src/oldarch/…ManagerSpec.kt   ← Adapter Old Arch  (löschbar: JA)
```

**Die eiserne Regel:** Architektur-Unterscheidungen existieren nur als
*ganze Dateien*. Kein `#ifdef RCT_NEW_ARCH_ENABLED` innerhalb der Swift- oder
Kotlin-Core-Dateien, keine `if (isFabric)`-Zweige in der Logik. Ein `#if
os(tvOS)` im Swift-Core ist erlaubt — das ist Plattform, nicht Architektur.

Drei Dinge sind erfreulicherweise **von sich aus arch-agnostisch** und brauchen
gar keinen Adapter:

- **Der JS-Layer.** `codegenNativeComponent` fällt auf Old Arch automatisch auf
  `requireNativeComponent` zurück, `codegenNativeCommands` dispatcht dort über
  den UIManager. Eine Spec, beide Architekturen, keine Verzweigung.
- **Android-Events.** `UIManagerHelper.getEventDispatcherForReactTag()` mit
  einer eigenen `Event`-Subklasse funktioniert auf beiden Architekturen. Das
  ersetzt `VideoEventEmitter` ersatzlos.
- **Die Player-Logik selbst.** Swift/Kotlin-Core sieht von React nur die
  View-Basisklasse.

Damit reduziert sich die Dual-Arch-Last auf rund 160 Zeilen Adapter-Code.

---

## 4. Umbauplan

Die Reihenfolge ist wesentlich: Ohne Phase 0 und 1 migriert man Phase 2 blind.

### Phase 0 — Fundament (kein Breaking Change, ~1 Tag)

Ziel: Änderungen überhaupt überprüfbar machen.

- [x] Publish-Pipeline entschärfen: Release über Tag oder `workflow_dispatch`
      statt Auto-Patch-on-Push, mit vorgeschaltetem Build-/Lint-Job.
      → `ci.yml` (auch als `workflow_call` wiederverwendbar) + `release.yml`;
      `npmpublish.yml` und `npmpublish-beta.yml` entfallen.
- [x] `files`-Whitelist in `package.json`. → Tarball von 44 auf 29 Dateien.
- [x] `peerDependencies` für `react` und `react-native` ergänzen.
      → `react >=18.2.0`, `react-native >=0.74.0` (Begründung: Phase 1).
- [x] Podspec-Version aus `package.json` lesen
      (`JSON.parse(File.read("package.json"))`).
- [x] VLC-Version an *einer* Stelle definieren (Podspec, Expo-Plugin, Gradle).
      → Feld `vlc: { ios, android }` in `package.json`; Podspec, Expo-Plugin und
      `android/build.gradle` (via `JsonSlurper`) lesen es. iOS ist damit einheitlich
      auf `3.5.1` — der Expo-Plugin-Pin `3.3.10` hat vorher mit dem Podspec
      kollidiert.
- [x] `.idea/` und `ios/**/xcuserdata` aus dem Repo entfernen, `.gitignore`
      ergänzen. → zusätzlich `android/react-native-yz-vlcplayer.iml`.
- [x] `onRecordingCreated`-Guard und `Bubbling`/`Direct`-Inkonsistenz fixen.
      → `RCTVLCPlayer.h` auf `RCTDirectEventBlock`, passend zum Manager.
- [x] *Zusätzlich:* `react-native-slider` aus `dependencies` entfernt. Der Import
      in `ControlBtn.js` ist auskommentiert — das Paket wurde von jedem Konsumenten
      mitgezogen, ohne je geladen zu werden.

### Phase 1 — Repo-Struktur, TypeScript, Test-Matrix

Ziel: Standard-Layout, generierte Typen, lauffähige Beispiel-App.

- [x] Auf das Layout von `create-react-native-library` ziehen.
      → `src/`, `example/`, npm-Workspace. Die Example-App verlinkt die Library
      über `file:..`; `"*"` reicht nicht, weil das Root-Package selbst kein
      Workspace-Eintrag ist und npm sonst 1.0.98 aus der Registry zieht.
- [x] `src/` in TypeScript, Build via `react-native-builder-bob`
      (commonjs / module / typescript).
      → Kein `exports`-Feld: bob's Non-ESM-Dual-Output ist CJS/ESM-ambivalentes
      `.js`, und eine `exports`-Map würde die Deep-Imports verbieten, die vorher
      funktionierten.
- [x] ESLint + Prettier + `tsconfig.json`.
      → ESLint 10 Flat Config mit `typescript-eslint` und
      `eslint-plugin-react-hooks` 7. `eslint-plugin-react` deklariert ESLint 10
      nicht und würde `npm ci` an einem Peer-Konflikt scheitern lassen.
      `tsconfig` mit `strict`, `noUnusedLocals`, `noUnusedParameters`.
- [x] **`example/`-App mit Expo-Prebuild.** Wichtigster Einzelschritt für
      Review-Fähigkeit. → Expo SDK 54 / RN 0.81.6. `EXAMPLE_ARCH=old` schaltet
      über `app.config.js` auf die Old Architecture um. Die App bedient die
      gesamte imperative API (Seek, Snapshot, Recording, Aspect Ratio) und zeigt
      an, auf welcher Architektur sie läuft.
- [x] **CI-Matrix über vier Konfigurationen:** iOS und Android, jeweils Old und
      New Arch. Solange Old Arch supported ist, ist das die einzige Absicherung
      gegen stille Regressionen.
- [x] `index.d.ts` löschen — wird generiert.
- [x] Klassen-Component → Function-Component mit `forwardRef` +
      `useImperativeHandle`; `prop-types` entfernen. → `prop-types` stand
      ohnehin in keiner `dependencies`-Liste und wurde transitiv über RN
      aufgelöst.
- [x] `resolveAssetSource`-Deep-Import auf `Image.resolveAssetSource` umstellen.
- [x] RN-Mindestversion festlegen und **in der Matrix verifizieren** — die
      benutzten Codegen-Features (`codegenNativeCommands`, Old-Arch-Fallback)
      bestimmen die Untergrenze, nicht die Wunschvorstellung.
      → **`>=0.74.0`**, Matrix verifiziert `0.81.6`. Siehe den Kasten unten:
      oberhalb von 0.81 *kann* die Old Arch nicht mehr verifiziert werden.

#### Der Deckel auf der Old Architecture

**RN 0.82 hat die Old Architecture entfernt.** `newArchEnabled=false` und
`RCT_NEW_ARCH_ENABLED=0` werden dort ignoriert. RN 0.81 / Expo SDK 54 sind die
letzten Versionen, in denen die vier Konfigurationen überhaupt existieren.

Das hat zwei Konsequenzen für den Restplan:

1. Die Example-App ist auf RN 0.81 festgenagelt, solange die Matrix vier Jobs
   hat. Ein Update auf 0.82+ ist damit gleichbedeutend mit Phase 3.
2. Phase 3 ist kein „irgendwann" mehr, sondern hat einen Auslöser: sobald die
   RN-0.81-Reihe kein Sicherheitssupport mehr bekommt, wird das Festhalten an
   der Old Arch zum Blocker für die eigene CI.

#### Vorgezogen aus Phase 2b/2d

Ohne diese Punkte baut die Example-App nicht, und ohne baubare App ist Phase 1
wirkungslos. Bewusst nur das Minimum:

- [x] `android/build.gradle`: `buildscript`-Block mit AGP 4.0.2 entfernt,
      `com.facebook.react:react-native:+` → `apply plugin: 'com.facebook.react'`
      + `com.facebook.react:react-android`, wirkungsloses mvnrepository-Repo
      entfernt, `compileOptions` auf Java 17, `compileSdk`/`minSdk` statt der in
      AGP 9 entfallenden `*Version`-Varianten.
- [x] Podspec: `install_modules_dependencies(s)` statt `s.dependency 'React'`
      (definiert `RCT_NEW_ARCH_ENABLED`), `deployment_target` 8.4/10.2 → 13.4.
      13.4 ist das Minimum von RN 0.74 und damit passend zur deklarierten
      Untergrenze; Phase 2b hebt zusammen mit Swift auf 15.1.
- [x] Expo-Plugin `withGradleTasks`: Der Anker
      `applyNativeModulesAppBuildGradle(project)` existiert in RN-≥0.71- und
      Expo-Templates nicht mehr — `expo prebuild` **crashte** daran. Jetzt
      `apply plugin: "com.facebook.react"`. Zusätzlich ist die
      `libc++_shared.so`-Bereinigung null-safe: vorher lief sie bei nicht
      gefundenem Verzeichnis in eine NPE mitten im Build.

Noch offen und bewusst bei Phase 2d gelassen: Gradle Wrapper 6.9,
`androidx.legacy:legacy-support-v4`.

#### Verhaltensänderungen in Phase 1

Der Umbau ist signaturgleich, aber an vier Stellen ist altes Verhalten
nachweisbar falsch und wurde mit korrigiert:

1. `source` wird nicht mehr mutiert. `resolveAssetSource` gibt Objekt-Quellen
   unverändert zurück, der Player schrieb also `isNetwork`, `autoplay` und
   `--repeat` in das Objekt des Aufrufers.
2. `TimeLimit` renderte auskommentierte Zeilen als JSX-Textkinder (`//`) direkt
   in einer `TouchableOpacity` — „Text strings must be rendered within a
   `<Text>`". Jeder, der die Werbevorlauf-Funktion (`isGG`) benutzte, bekam einen
   Crash.
3. `VLCPlayerView.componentWillUnmount` rief `_onStopped()`, was das `onStopped`-
   Prop (also `onEnded`) während des Unmounts feuerte und darin `setState`
   aufrief. Jetzt wird nur noch die native View pausiert.
4. `SizeController.getChangeRatio()` gab auf den meisten Geräten einen String
   (`"1.33"`) und auf manchen die Zahl `1` zurück. Jetzt durchgängig `number`.

Nicht mitkorrigiert, weil es sichtbares Verhalten ändern würde:
`Orientation.lockToPortrait` / `lockToLandscape` in `playerView/index.tsx` sind
im Original hängende Ausdrücke ohne Aufruf. Die Stellen sind kommentiert und
gehören zu Phase 4.

Die einzige echte Bruchstelle ist der **Deep Import**: `…/VLCPlayer` und
`…/playerView/…` liegen jetzt unter `lib/`. Dokumentiert war nur
`import { VLCPlayer, VlCPlayerView } from 'react-native-vlc-media-player'`, und
das ist unverändert; ein `exports`-Feld wurde gerade deshalb *nicht* eingeführt.
Gehört in die Release Notes.

#### Was der erste echte Build zutage gebracht hat

Beides war vorher nicht sichtbar, weil nichts gebaut wurde:

- **`minSdk 26` gegen Template-Default 24.** Der Manifest-Merger bricht mit
  `minSdkVersion 24 cannot be smaller than version 26` ab. Das trifft jeden
  Expo-Nutzer. Im README dokumentiert, in der Example-App über
  `expo-build-properties` gesetzt.
- **Die Old-Arch-iOS-Konfiguration baut React Native aus dem Quellcode.** Expo
  setzt `RCT_USE_PREBUILT_RNCORE`/`RCT_USE_RN_DEP` nur, wenn
  `newArchEnabled != 'false'`. Folge: `Pods/fmt` 11.0.2 wird mitkompiliert und
  scheitert am clang aus Xcode 26+ (`call to consteval function … is not a
  constant expression`). Der CI-Job pinnt daher Xcode 16.4. Lokal auf macOS 26+
  ist diese eine Konfiguration nicht baubar — zusätzlich bricht dort Apples
  `openrsync` die CocoaPods-Phase `[CP] Copy XCFrameworks` von MobileVLCKit.
  Verifiziert wurden lokal drei der vier Konfigurationen; die vierte hängt an
  diesen beiden Toolchain-Punkten, nicht an diesem Repo.
- **`install_modules_dependencies` setzt `-DRCT_NEW_ARCH_ENABLED=1` nur in
  `OTHER_CPLUSPLUSFLAGS` und `OTHER_SWIFT_FLAGS`**, nicht in
  `GCC_PREPROCESSOR_DEFINITIONS`. Für reine `.m`-Dateien ist das Makro also nicht
  definiert. Der `#ifndef RCT_NEW_ARCH_ENABLED`-Guard um `RCTVLCPlayerManager.m`
  aus Phase 2b greift so nicht — die Datei muss `.mm` werden oder der Guard
  anders gezogen werden.

### Phase 2a — JS-Spec (arch-agnostisch)

- [x] `src/VlcPlayerViewNativeComponent.ts` mit `codegenNativeComponent`,
      Events als `DirectEventHandler<…>`.
      → 18 Props, 15 Events. Fabric-Name `VlcPlayerView`,
      `paperComponentName: 'RCTVLCPlayer'`, damit die Old Arch weiter die
      bestehenden View-Manager auflöst.
- [x] Commands via `codegenNativeCommands`: `startRecording`, `stopRecording`,
      `stopPlayer`, `snapshot`, **`seek`**, `setResume`, `setAspectRatio`.
      → neun Commands, aber die vier prop-spiegelnden heißen `applyResume`,
      `applyPaused`, `applyAutoAspectRatio` und `applyAspectRatio`. Der Grund ist
      kein Geschmack, sondern Codegen: siehe unten.
- [x] Die `setNativeProps`-Aufrufe in echte Props bzw. Commands überführen.
      Öffentliche Methodensignaturen bleiben unverändert — der Umbau ist für
      Konsumenten unsichtbar. → `setNativeProps` bleibt als deprecated
      Passthrough am Ref, damit bestehende Aufrufe weiter kompilieren; die
      Library selbst benutzt es nicht mehr.
- [x] *Zusätzlich:* `scripts/check-codegen-spec.js` + `npm run check-spec` in der
      CI. Das Skript parst die Spec mit React Natives **echtem** Codegen-Parser
      und gleicht sie gegen die Props/Events ab, die die nativen View-Manager
      deklarieren.

#### Warum die Commands ihre native Gegenseite mitbringen mussten

Ein Command ist ein zweiseitiger Vertrag. Der Plan hat 2a als rein
JS-Phase geführt und `receiveCommand`-auf-String erst in 2d — diese Reihenfolge
hätte zwischen 2a und 2d **alle** Commands auf Android gebrochen:
`codegenNativeCommands` dispatcht Namen, und `ReactVlcPlayerViewManager`
überschrieb nur die entfernte int-Variante; die String-Variante der Basisklasse
ist ein No-op. Deshalb liefert 2a die minimale native Gegenseite mit:

- **Android:** `receiveCommand(view, String, args)` mit allen neun Commands. Die
  int-Variante bleibt und delegiert, wobei `startRecording`/`stopRecording`/
  `snapshot` ihre historischen ids 1/2/3 behalten.
- **iOS:** die vier bestehenden `RCT_EXPORT_METHOD`-Blöcke laufen jetzt über einen
  `withView:perform:`-Helper, dazu fünf neue Commands. Der Block ist damit
  geschlossen und in 2b löschbar statt umzubauen. `setSeek:`, `setResume:`,
  `setPaused:` und `setVideoAspectRatio:` sind dafür im Header deklariert.

`applyPaused` gibt es, weil der interne `onVideoStopped`-Handler bisher
`setNativeProps({ paused: true })` benutzte, um hinter React's Rücken zu
schreiben. `applyAutoAspectRatio` ist auf iOS bewusst ein leerer Handler: die
Funktion existiert dort nicht, und ohne den Handler würde `RCTUIManager`
„No command found with name" loggen.

#### Die Namensregel: `applyX`, nicht `setX`

Ein Command `setX` kollidiert mit einem Prop `x`. Codegen generiert für beide
`setX(view, value)`, und das generierte `VlcPlayerViewManagerInterface.java`
deklariert die Methode dann zweimal — javac bricht ab. Der Android-Build hat
genau drei solche Fehler geworfen (`setResume`/`resume`, `setPaused`/`paused`,
`setAutoAspectRatio`/`autoAspectRatio`). Die Commands, die ein Prop imperativ
setzen, heißen deshalb `apply…`. `seek` bleibt `seek`, weil das Prop `seek` zu
`setSeek` generiert und nicht kollidiert.

**Warum überhaupt Commands und nicht einfach Props?** Weil `seek` und `resume`
Aktionen sind, keine Zustände. Zweimal auf dieselbe Position springen erzeugt
keine Prop-Änderung, React diffed den zweiten Aufruf weg — und
`VLCPlayerView._reload` ruft genau so wiederholt `resume(false)`.

#### Was Codegens eigener Parser korrigiert hat

- `ReadonlyArray<T>` ist in Event-Payloads nicht erlaubt.
- Ein Typalias als Array-Elementtyp wird nicht aufgelöst: `audioTracks: Track[]`
  scheitert, die Track-Form muss inline stehen. `Track` existiert weiter für die
  öffentliche API.

Beides wäre erst in 2b/2c aufgefallen, wo Codegen tatsächlich läuft.

#### Nebenbefunde

- **`stopPlayer()` war auf Android nie verdrahtet.** `getCommandsMap()` kannte
  nur `startRecording`, `stopRecording` und `snapshot`. Der Aufruf lief ins Leere.
  Jetzt vorhanden.
- **Das `src`-Prop liest keine der beiden Plattformen.** Es wurde bei jedem Render
  mitgeschickt und ist entfallen.
- **`resizeMode`, `playInBackground` und `poster` liest auch keine Plattform.**
  Sie bleiben in `VLCPlayerProps` (als `@deprecated` markiert), werden aber nicht
  mehr an die native View durchgereicht.
- `resume()` ohne Argument bedeutet jetzt `resume(true)`. Vorher wurde
  `undefined` gesetzt.
#### Codegen läuft schon — halb

Zwei verschiedene Codegen-Ausgaben, und sie sind unterschiedlich weit:

- **Die JS-View-Config: läuft nicht.** Der Babel-Plugin
  (`@react-native/babel-plugin-codegen`) greift im bob-Build nicht, `lib/` behält
  den Runtime-Aufruf von `codegenNativeComponent`. Dessen Fallback ist
  `requireNativeComponent(paperComponentName)` — also exakt das Verhalten von
  vorher. Die statische View-Config entsteht später; erst dann wird die Spec für
  die JS-Seite load-bearing, und ein fehlendes Prop verschwindet still.
- **Die nativen Android-Artefakte: laufen.** Weil Phase 1
  `apply plugin: 'com.facebook.react'` in `android/build.gradle` gesetzt hat,
  generiert das RN-Gradle-Plugin die Library-Spec ohne weiteres Zutun — kein
  `codegenConfig` nötig. Nach einem Example-Build liegen unter
  `android/build/generated/source/codegen/` bereits:
  `VlcPlayerViewManagerInterface.java`, `VlcPlayerViewManagerDelegate.java` und
  der vollständige C++-Layer (`Props.h` mit `VlcPlayerViewSourceStruct`,
  `EventEmitters.h`, `ShadowNodes.h`, `ComponentDescriptors.h`).

Damit ist Phase 2d weniger Arbeit als geplant: die Delegate-Klasse, von der
`VlcPlayerViewManager` erben soll, wird schon erzeugt. Und der Objektprop
`source` übersetzt Codegen von sich aus in ein C++-Struct — der Punkt, an dem
dieser Plan hätte scheitern können.

Der generierte `VlcPlayerViewComponentDescriptor` ist zur Laufzeit noch
ungenutzt: JS fragt über `paperComponentName` nach `RCTVLCPlayer`, nicht nach
`VlcPlayerView`. Beides zusammenzuführen ist genau die Aufgabe von 2b/2d.

#### Android sendet weniger, als die Typen behaupten

Aufgefallen beim Abgleich: `VideoEventEmitter.progressChanged` schickt nur
`currentTime` und `duration`, während `OnProgressEventProps` zusätzlich
`position`, `remainingTime` und `target` deklariert. Die Typen sind von iOS
abgeleitet. Das ist eine bestehende Ungenauigkeit, keine durch 2a entstandene —
zu klären in Phase 2c/2d, wenn der Emitter auf `UIManagerHelper` umgestellt wird.

### Phase 2b — iOS auf Swift

- [x] **Core:** `ios/VlcPlayerView.swift` — `UIView`-Subklasse mit der Logik aus
      den 544 Zeilen `RCTVLCPlayer.m`. VLCKit-Import via `import MobileVLCKit`
      bzw. `import TVVLCKit` unter `#if os(tvOS)`.
      → 539 Zeilen Swift. `ios/RCTVLCPlayer/` und das toter Ballast gewordene
      `ios/RCTVLCPlayer.xcodeproj` sind weg.
- [x] Events als `@objc`-kompatible Closures am Core
      (`var onProgress: ((NSDictionary) -> Void)?`) — keine React-Typen im Core.
      → Die Closures heißen wie die Events in der Spec, damit der Legacy-Adapter
      sie ohne eine Zeile Übersetzungscode binden kann.
- [x] **Adapter New Arch:** `ios/VlcPlayerComponentView.mm`, Subklasse von
      `RCTViewComponentView`. Muss ObjC++ sein (C++-Props-Typen aus Codegen),
      hält die Swift-View und übersetzt `updateProps:` und `handleCommand:args:`.
      → Commands kommen nicht über `handleCommand:args:`, sondern über das
      generierte `RCTVlcPlayerViewViewProtocol`, das der Adapter implementiert.
- [x] **Adapter Old Arch:** `ios/RCTVLCPlayerManager.m` bleibt, aber reduziert
      auf `RCTViewManager` + `RCT_EXPORT_VIEW_PROPERTY`; die vier
      `RCT_EXPORT_METHOD`/`uiManager`-Blöcke entfallen (Commands laufen jetzt
      über die Spec). Ganze Datei in `#ifndef RCT_NEW_ARCH_ENABLED`.
      → **Dieser Punkt war falsch.** Die `RCT_EXPORT_METHOD`-Blöcke *müssen*
      bleiben; siehe unten. Die Datei heißt jetzt `.mm`, was der Guard erzwingt.
- [x] **Podspec:** `install_modules_dependencies(s)` (definiert
      `RCT_NEW_ARCH_ENABLED`), `s.swift_version`,
      `s.ios.deployment_target = "15.1"`, `static_framework` beibehalten.
      → `deployment_target` bleibt bei **13.4**: Swift braucht 15.1 nicht, und
      13.4 ist das Minimum von RN 0.74, also der deklarierten Untergrenze. Auf
      15.1 zu gehen wäre ein Breaking Change ohne Gegenwert.
- [x] **Papercut einplanen:** die ObjC++-Adapter brauchen den generierten
      Swift-Header (`#import "react_native_vlc_media_player-Swift.h"`, Name =
      Modulname mit Unterstrichen). Das ist die häufigste Fehlerquelle beim
      ObjC↔Swift-Mix in Pods — früh gegen die Beispiel-App verifizieren, auch
      für tvOS.
      → Der Papercut ist eingetreten, aber anders als erwartet, und ist jetzt
      strukturell ausgeschlossen. Siehe „Der Swift-Header".

#### Warum die Commands im Legacy-Adapter bleiben mussten

Der Plan ging davon aus, dass die `RCT_EXPORT_METHOD`-Blöcke entfallen, weil
„Commands jetzt über die Spec laufen". Auf der Old Architecture laufen sie aber
*durch* den `RCTUIManager`: `dispatchViewManagerCommand` löst den Command-Namen
gegen `moduleData.methodsByName` des ViewManagers auf und stellt den React-Tag
voran. Ein `RCTViewManager` hat keinen anderen Hook für Commands. Sie bleiben
also — gebündelt hinter einem `withView:perform:`-Helper, damit Phase 3 sie in
einem Stück löscht.

#### Der Swift-Header

Der generierte `react_native_vlc_media_player-Swift.h` deklariert die öffentliche
Swift-Klasse **mit ihren Protokoll-Konformanzen**. Weil `VlcPlayerView` ursprünglich
selbst `VLCMediaPlayerDelegate` und `VLCCustomDialogRendererProtocol` erfüllte,
stand im Header `@interface VlcPlayerView (…) <VLCMediaPlayerDelegate>` — und jede
ObjC++-Datei, die den Header importiert, brach mit
`cannot find protocol declaration for 'VLCMediaPlayerDelegate'`.

Sichtbarkeit zu reduzieren geht nicht: Swift verlangt `public` für Methoden, die
eine Anforderung eines öffentlichen Protokolls erfüllen.

Die naheliegende Lösung wäre, in jedem Adapter vor dem Swift-Header VLCKit zu
importieren — inklusive `#if TARGET_OS_TV`-Zweig, weil das Framework auf iOS
`MobileVLCKit` und auf tvOS `TVVLCKit` heißt. Stattdessen tragen jetzt ein
`fileprivate` **`VlcPlayerDelegateProxy`** die beiden Konformanzen. Ergebnis: im
generierten Header kommt kein einziger VLC-Typ mehr vor, und die Adapter brauchen
VLCKit überhaupt nicht — auf keiner Plattform.

#### Ohne `codegenConfig.ios.components` gibt es keine Fabric-Komponente

Der stillste Fehler dieser Phase. React Native erzeugt
`RCTThirdPartyComponentsProvider.mm`, das Komponentennamen auf ObjC-Klassen
abbildet. Der Generator überspringt jede Library, deren `codegenConfig` **kein**
`ios`-Feld hat (`if (!iosConfig) continue;`) — auch den deprecated Fallback, der
`.mm`-Dateien nach `Class<RCTComponentViewProtocol> …Cls(` durchsucht. Ergebnis
war ein leeres Mapping: der Build lief durch, aber zur Laufzeit hätte Fabric die
Komponente nie gefunden. Nötig ist:

```json
"codegenConfig": {
  "ios": { "components": { "VlcPlayerView": { "className": "VlcPlayerComponentView" } } }
}
```

Die `VlcPlayerViewCls()`-Funktion im Adapter bleibt trotzdem: RN-Versionen vor
0.80 kennen das `ios.components`-Feld nicht und finden die Klasse nur über den
Crawl.

#### `target` bleibt draußen

Der ObjC-Core schrieb `@"target": self.reactTag` in jeden Event-Payload und
brauchte dafür `UIView+React`. Das ist überflüssig: `RCTComponentEvent` setzt
`body[@"target"] = viewTag` selbst. Der Swift-Core liefert deshalb Payloads ohne
`target`; auf der Old Arch ergänzt React Native es, auf Fabric der Adapter aus
`self.tag`. Damit ist der Core wirklich React-frei.

#### Der iOS-Old-Arch-Build ist lokal nicht mehr blockiert

`RCT_USE_RN_DEP=1` beim `pod install` ersetzt den Quellcode-Pod `fmt` durch die
vorgebauten `ReactNativeDependencies` — und damit verschwindet der
`consteval`-Fehler gegen den clang aus Xcode 26+. Alle vier Konfigurationen sind
damit erstmals lokal verifizierbar. Die CI bleibt bewusst ohne dieses Flag und
mit dem Xcode-16.4-Pin, weil sie das bauen soll, was ein Konsument ohne
Sonderflags bekommt.

#### Nebenbefunde aus der Konversion

Die Swift-Fassung räumt vier Dinge mit auf, die der ObjC-Compiler angemeckert hat
und die der Rewrite nicht wiederholen konnte:

- `_subtitleUri` war als `NSString *` deklariert, bekam aber eine `NSURL *`
  zugewiesen und wurde als `NSURL *` weiterverwendet.
- `RCTVLCPlayer` deklarierte `VLCMediaPlayerDelegate` nie, wurde aber als Delegate
  gesetzt.
- `setVideoAspectRatio:` verwarf den `const`-Qualifier des C-Strings.
- Die Event-Blöcke wurden **ungeprüft** aufgerufen (`self.onVideoOpen(…)`). Ein
  fehlendes Prop wäre ein Crash gewesen; nur weil der JS-Wrapper immer alle Events
  setzt, fiel das nie auf. Optionale Closures in Swift können das nicht.

Und `RCT_CUSTOM_VIEW_PROPERTY(muted, …)` ist zu einem normalen
`RCT_EXPORT_VIEW_PROPERTY` geworden, weil der Swift-Core `muted` als Property
anbietet.

#### Mitkorrigiert

`_release` entfernte alle `NSNotificationCenter`-Observer und wurde auch aus
`setSource:` aufgerufen. Nach dem ersten Quellwechsel war das Vordergrund-/
Hintergrund-Handling damit tot. `releasePlayer()` baut jetzt nur den Player ab;
die Observer gehen erst im `deinit`. Das musste sein: Fabric recycelt Views über
denselben Pfad, wodurch der Fehler bei jeder Wiederverwendung zugeschlagen hätte.
Die sichtbare Folge ist, dass Wiedergabe beim Zurückkehren in den Vordergrund
tatsächlich wieder aufgenommen wird — also das, wofür der Observer gedacht war.

Zwei Dinge, die beim Review des Adapters auffielen und keine Portierungsfehler
sind, sondern Fallen des Ziel-Layouts:

- Der Event-Emitter-Getter liefert `std::shared_ptr`. Eine Nachricht an `nil` ist
  nur für Skalare und kleine Structs definiert, nicht dafür — jeder Block prüft
  seinen `weakSelf` deshalb *vor* dem Zugriff.
- Swift erbt `init()` nicht, sobald eine Subklasse einen eigenen designated
  initializer deklariert. Der Legacy-Adapter ruft darum explizit
  `initWithFrame:CGRectZero` statt `new`.

#### Verhaltenserhaltend übernommen, obwohl fragwürdig

- `applicationWillResignActive` ruft `play()`, nicht `pause()`.
- Der `VLCConsoleLogger` läuft unverändert auf `kVLCLogLevelDebug`.

#### tvOS

Nicht verifiziert. Der Code ist `#if os(tvOS)`-korrekt und die Adapter brauchen
dank des Proxys keinen plattformabhängigen Import mehr, aber ein tvOS-Build
braucht `react-native-tvos` und steht nicht in der Matrix.

### Phase 2c — Android auf Kotlin

**Vor** dem Adapter-Umbau und als eigener PR. Eine 983-Zeilen-Sprachkonversion
mit einem Event-Dispatch-Rework im selben Diff zu vermischen macht das Bisecten
einer Regression unzumutbar. Diese Phase ist rein verhaltenserhaltend und gegen
die Beispiel-App aus Phase 1 verifizierbar.

- [x] Kotlin-Plugin in `android/build.gradle`:
      `apply plugin: 'org.jetbrains.kotlin.android'`.
- [x] **Kotlin-Version nicht hart pinnen.** Eine Library, die ihre eigene
      Version festnagelt, kollidiert mit der der App. Übliches Muster:
      `rootProject.ext.has("kotlinVersion") ? rootProject.ext.get("kotlinVersion") : "<fallback>"`.
      RN selbst konfiguriert Kotlin bereits, das Risiko für Konsumenten ist
      dadurch gering.
      → Noch konsequenter: gar keine Version, auch kein Fallback. Das Plugin wird
      ohne `buildscript`-Block angewendet und kommt damit aus dem Classpath der
      App, den jedes RN-Template seit 0.71 setzt. Ein eigener Classpath-Eintrag
      mit Fallback-Version hätte genau die Kollision erzeugt, die er vermeiden
      soll („Kotlin Gradle plugin loaded multiple times").
- [x] `jvmTarget` und `compileOptions` auf denselben Wert (17 bei aktueller AGP).
      → Über `KotlinCompile.compilerOptions`, nicht das in Kotlin 2.x
      abgekündigte `kotlinOptions`.
- [x] Kein explizites `implementation kotlin-stdlib` mit fixer Version — kommt
      über das Plugin.
- [x] `ReactVlcPlayerView.java` (983 Zeilen) → `VlcPlayerView.kt`. Konverter der
      IDE als Ausgangspunkt, danach Handarbeit.
      → 660 Zeilen. Die Differenz ist überwiegend toter Code, siehe unten.
- [x] `ReactVlcPlayerViewManager.java` und `VideoEventEmitter.java` mitkonvertieren.
      → Ebenso `ReactVlcPlayerPackage` (der Name bleibt: öffentliche API für
      manuell verlinkende Apps). Der Manager heißt jetzt `VlcPlayerViewManager`.
- [x] **Nullability ernst nehmen.** Der Java-Code nutzt `@Nullable` inkonsistent;
      die Konversion legt echte NPE-Risiken in den VLC-Event-Callbacks offen. Das
      ist der eigentliche Gewinn der Phase — die Fundstellen nicht mit `!!`
      zudecken.
      → Kein einziges `!!`. Fundstellen unten.
- [x] Verifizieren: Beispiel-App auf Old *und* New Arch, bevor Phase 2d beginnt.
      → Siehe „Verifikation".

#### Nullability-Fundstellen

Echte Absturz- oder Fehlerpfade, die die Konversion offengelegt hat:

- **Player-Event-Listener** las `mMediaPlayer.isPlaying()` ungeprüft. VLC kann
  ein Event noch nach `releasePlayer()` zustellen → NPE im VLC-Callback-Thread.
- **`releasePlayer()`** prüfte nur `libvlc`. Wirft `new MediaPlayer(libvlc)`,
  ist `libvlc` gesetzt und der Player `null` — der nächste Release stürzte ab.
- **`createPlayer()`** lief los, bevor das `source`-Prop da war (die Surface
  kann früher verfügbar sein), und warf eine NPE, die das pauschale
  `catch (Exception)` schluckte. Jetzt ein früher Return, gleiche Wirkung.
- **`getAudioTracks()`/`getSpuTracks()`** liefern `null`, auch wenn der Count
  einen Moment vorher > 0 war. Wurde ungeprüft iteriert.
- **`setSubtitleUri(null)`** (Prop entfernt) rief `addSlave(…, null, …)`.
- **Snapshot mit bloßem Dateinamen:** `getParentFile()` ist `null`; die NPE wurde
  als fehlgeschlagener Snapshot gemeldet.
- **`setSrc` im Manager** las `isNetwork` und `autoplay` per `getBoolean`, das
  bei fehlendem Key wirft — und verwarf beide Werte. Der JS-Wrapper setzt immer
  beide, deshalb fiel es nie auf.

Und zwei Dinge, die keine NPEs sind, aber dieselbe Kategorie: der
Progress-`Runnable` wurde auf einem eigens gestarteten `Thread` erzeugt und dann
doch auf den Main-Looper gepostet (jetzt direkt, ohne den Race auf das Feld), und
`new Handler()` ohne Looper ist abgekündigt (jetzt explizit `Looper.getMainLooper()`).

#### Toter Code, der nicht mitkonvertiert wurde

`setSrc(String, boolean, boolean)` samt `src`/`netStrTag`, das nie zugewiesene
Feld `surfaceView`, das nur geschriebene `surfaceVideo` (das bei jedem
Surface-Wechsel eine `Surface` leakte), `screenWidth`/`screenHeight`, das nur
geschriebene `mVideoInfo`, `startsWithValidScheme()`, die 90 auskommentierten
Zeilen `changeSurfaceSize()` (die auf nicht existierende Konstanten verwiesen und
so nie kompiliert hätten) und im Emitter `progressChanged()`, `error()` und
`isPlaying()` — alle drei nie aufgerufen. Das klärt nebenbei den Befund aus 2a:
`progressChanged()`, das nur `currentTime`/`duration` schickte, war gar nicht der
Pfad, über den Progress-Events laufen.

#### Verhaltenserhaltend übernommen, obwohl fragwürdig

Bewusst nicht in 2c geändert, damit die Phase eine reine Konversion bleibt:

- `initOptions` und `mediaOptions` verlieren ihren **letzten** Eintrag
  (`i < size() - 1`). Behoben in 2d.
- `progressUpdateInterval` baut den Player bei jedem Setzen neu auf.
- `volume` geht als `(int)` an VLC, dessen Skala 0–100 ist; der Default `1.0`
  wird zu Lautstärke 1.
- `repeat` ist auf Android ein No-op; es wirkt nur über `--repeat` in
  `initOptions` — was der Off-by-one bis 2d verschluckte, wenn es der letzte
  Eintrag war.
- `Dialog.setCallbacks` ist in libvlc global; bei mehreren Playern gewinnt der
  zuletzt erzeugte.

#### Autolinking liest Kotlin per Regex

Ein Kommentar über der Klasse — „The class name is public API: …" — reichte, dass
die Autolinking-Erkennung `name` als Package-Klasse eintrug und `PackageList.java`
nicht mehr kompilierte. Die Erkennung ist eine Regex über den Quelltext, die das
Wort *class* gefolgt von einem Wort und einem Doppelpunkt sucht. Der Kommentar in
`ReactVlcPlayerPackage.kt` warnt jetzt davor. Gefährlich daran: Expo cacht das
Ergebnis unter `android/build/generated/autolinking/` — ein Build mit altem
Cache bleibt grün, erst der nächste saubere Prebuild bricht.

#### Mitgefunden: Kein Konsument konnte bundeln

Beim ersten Lauf der Beispiel-App überhaupt — vorher wurde sie nur kompiliert —
brach Metro ab:

```
'Commands' is a reserved export and may only be used to export the result of codegenNativeCommands.
```

Ursache war `export { Commands as VlcPlayerViewCommands } from …` in
`src/index.tsx`, seit Phase 2a. `@react-native/babel-plugin-codegen` ist Teil des
Standard-Presets, läuft auf **jeder** Datei der App und lehnt jeden
Export-Specifier mit lokalem Namen `Commands` ab. Das hätte jede App getroffen,
die die Library importiert. Der Build der Library selbst sieht den Plugin nie:
bob kopiert die Spec unverändert und überlässt die Transformation der App.

Behoben durch Umbinden vor dem Export. Damit es nicht wiederkommt:
`scripts/check-babel-codegen.js` (`npm run check-babel`, in `npm test` und CI)
lässt den Plugin über jede Quelldatei laufen und prüft zusätzlich, dass für die
Spec tatsächlich eine statische View-Config entsteht.

Dass die Beispiel-App vorher gar nicht startete, lag an einem zweiten Punkt:
`babel-preset-expo` lag nur verschachtelt unter `expo/node_modules` und war aus
`example/` nicht auflösbar. Jetzt explizit als devDependency der Beispiel-App.

#### Verifikation

Old und New Arch bauen (`:app:assembleDebug`); `npm run check-spec` liest die
Kotlin-Quellen. Laufzeit, erstmals im Emulator (Pixel, Android 16, New Arch):
die App startet, der Manager erzeugt die View, VLC öffnet die Quelle, und
Events erreichen JS — auf Fabric über den Interop-Layer, weil die JS-Seite noch
nach `RCTVLCPlayer` fragt (siehe 2d).

Zwei Befunde dabei, beide älter als 2c:

- Die Default-URL der Beispiel-App (`commondatastorage.googleapis.com/…`)
  antwortet mit HTTP 403. Die App konnte so nichts abspielen.
- `onVideoLoad` kam **ohne** `videoSize` an — Android setzt `videoSize`,
  `audioTracks` und `textTracks` nur, wenn sie existieren; die Spec deklariert
  sie als immer vorhanden, und iOS liefert sie immer. Die Beispiel-App stürzte
  daran ab, genau wie jeder Konsument, der den Typen glaubt. Behoben in 2d.

### Phase 2d — Android: Adapter & Gradle

- [x] `VideoEventEmitter` auf `UIManagerHelper.getEventDispatcherForReactTag()`
      + eigene `Event`-Subklasse umstellen. Arch-agnostisch, kein Adapter.
      → `canCoalesce()` ist `false`. Der Default ist `true`, und dann erreicht von
      zwei gleichnamigen Events derselben View im selben Frame nur das neuere JS —
      der alte `RCTEventEmitter`-Pfad hat nie etwas verworfen, und `onVideoEnd`
      oder `onSnapshot` dürfen nicht verloren gehen.
- [x] `receiveCommand` auf die String-Signatur.
      → War seit 2a erledigt; lebt jetzt nur noch in der Old-Arch-Basisklasse,
      weil auf der New Arch der generierte Delegate die Commands verteilt.
- [x] **Adapter:** `android/src/newarch/` und `android/src/oldarch/` mit je einer
      `VlcPlayerViewManagerSpec.kt`-Basisklasse (~20 Zeilen); Auswahl über
      `sourceSets` anhand des `newArchEnabled`-Flags. Der echte
      `VlcPlayerViewManager` erbt davon und existiert nur einmal.
      → Die New-Arch-Basis sind 20 Zeilen. Die Old-Arch-Basis ist länger (~100),
      weil sie das generierte Interface als abstrakte Methoden spiegelt, damit der
      Manager gegen beide Basen unverändert kompiliert, und weil sie die Commands
      per Namen auflöst. Phase 3 löscht sie als Ganzes.
- [x] Gradle modernisieren: RN-Gradle-Plugin, `react-android` statt
      `react-native:+`, AGP/Wrapper aktuell, `legacy-support-v4` und das
      wirkungslose mvnrepository-Repo entfernen.
      → Plugin und `react-android` waren seit Phase 1 da, das mvnrepository-Repo
      schon weg. `legacy-support-v4` ist entfernt (nichts nutzte es). AGP setzt die
      Library bewusst nicht: sie kommt aus der App. Der Wrapper unter
      `android/gradle/` (Gradle 6.9) ist **gelöscht** statt aktualisiert — es gab
      kein `gradlew` dazu, er wurde nicht veröffentlicht und war nur ein
      veraltetes JAR im Repo. Gebaut wird die Library immer als Teil einer App.

#### Ein Name für beide Architekturen

Der Kern dieser Phase, und im Plan nicht vorgesehen. Codegen erzeugt aus
`codegenNativeComponent` eine statische View-Config mit **einem** Namen. Mit
`paperComponentName: 'RCTVLCPlayer'` ist das der Paper-Name — auch auf Fabric.
Fabric suchte also nach `RCTVLCPlayer` und fand weder die generierte
`VlcPlayerView`-Komponente noch den iOS-Adapter aus 2b; die View lief nur, weil
der Interop-Layer für unbekannte Komponenten auf den alten ViewManager
zurückfällt. (Nachgewiesen im Bundle der Beispiel-App: `nativeComponentName =
'RCTVLCPlayer'`.)

Statt die Fabric-Komponente umzubenennen (was jede generierte Klasse und den
iOS-Adapter mitumbenannt hätte), heißen jetzt die Legacy-Manager `VlcPlayerView`:
Android über `getName()`, iOS über `RCT_EXPORT_MODULE(VlcPlayerViewManager)` — React
Native streicht das Suffix „Manager". `paperComponentName` ist aus der Spec
entfernt.

Für Konsumenten unsichtbar, solange sie die Komponente über den JS-Export
benutzen. Wer `requireNativeComponent('RCTVLCPlayer')` direkt aufruft, bricht.

#### Payloads halten jetzt, was die Typen versprechen

Weil Android eine `WritableMap` dispatcht und nicht die typisierten C++-Emitter,
ist auf Android jedes Payload so, wie die Map es enthält — die Spec ist dort nur
ein Versprechen. Drei Stellen, an denen es gebrochen war:

- **`onVideoLoad`** ließ `videoSize`, `audioTracks` und `textTracks` weg, solange
  sie unbekannt waren. Die Beispiel-App stürzte beim ersten Lauf daran ab
  (`Cannot read property 'width' of undefined`). Jetzt immer vorhanden:
  `{ width: 0, height: 0 }` bzw. leere Arrays, wie iOS.
- **`onVideoProgress`** hatte kein `remainingTime`. Jetzt `duration -
  currentTime`, nicht negativ.
- **`target`** fehlte in allen Android-Payloads. Der Emitter setzt es zentral.

Bewusst offen gelassen, weil es eine API-Entscheidung ist und kein Transportfehler:
Android schickt in mehreren Events mehr, als die Spec deklariert (`isPlaying`,
`position`, `type`, `bufferRate`), und `onVideoPlaying` ohne `seekable`,
`onVideoSeek` ohne `seekTime`. Das gehört in die Payload-Vereinheitlichung von
Phase 4.

#### Source-Felder, die auf Fabric nie angekommen wären

Android liest aus `source` auch `mediaOptions`, `hwDecoderEnabled` und
`hwDecoderForced`. Keines davon stand in der Spec — auf Fabric übersetzt Codegen
`source` in ein C++-Struct, und was dort nicht deklariert ist, verschwindet. Jetzt
deklariert, und auch im öffentlichen `VLCPlayerSource`-Typ (vorher konnten
TypeScript-Nutzer sie gar nicht setzen).

Die beiden Decoder-Felder haben `WithDefault<Int32, -1>`. Ohne den Sentinel käme
ein weggelassenes Feld auf Fabric als `0` an, und Android hätte
`setHWDecoderEnabled(false, false)` aufgerufen — Hardware-Dekodierung für jeden
aus, der die Felder nie gesetzt hat. `-1` heißt „nicht gesetzt" und wird wie ein
fehlender Key behandelt. Der iOS-Adapter vergleicht die drei Felder in
`SourceEqual` mit.

#### Mitbehoben

- **Off-by-one aus 2c:** `initOptions` und `mediaOptions` verloren ihren letzten
  Eintrag. Auf Android heißt das konkret: das `--repeat`, das der JS-Wrapper für
  `repeat` anhängt, kam nie bei VLC an.
- **Lifecycle-Listener-Leak:** jede View registrierte sich am Context und meldete
  sich nie ab; der Context hielt damit jede je erzeugte Player-View am Leben.
  `onDropViewInstance` ruft jetzt `dispose()`. Der `clear`-Prop ruft weiterhin nur
  `cleanUpResources()`, weil die View danach weiterlebt.
- **Beispiel-App:** neue Default-URL; die alte antwortete mit HTTP 403.

#### Verifikation

Gebaut: Android Old und New Arch (`:app:assembleDebug`, jeweils gegen die
richtige Basisklasse — per `javap` geprüft) und iOS New Arch, dessen Adapter die
neuen Struct-Felder vergleicht und damit nur kompiliert, wenn Codegen sie erzeugt
hat. Im generierten `Props.h` steht `int hwDecoderEnabled{-1}`. iOS Old Arch
wurde nicht neu gebaut; die einzige Änderung dort ist das Argument von
`RCT_EXPORT_MODULE`.

`npm test` prüft jetzt zusätzlich, dass die Spec kein `paperComponentName` mehr
setzt.

**Nicht verifiziert: Laufzeit auf 2d.** Der Emulator kam unter der Last des
Hosts (Load ~20) nicht mehr bis zum Start der JS-Seite — mit dem 2c-Build
genauso, also kein 2d-Effekt. Was 2c zur Laufzeit gezeigt hat, gilt für den
Teil, den 2d nicht anfasst; Fabric-Lookup unter dem neuen Namen, der
EventDispatcher-Pfad und die Commands über den generierten Delegate sind nur
kompiliert, nicht ausgeführt. Das ist der nächste Schritt, und es ist der erste,
der auf einer frei laufenden Maschine nur Minuten kostet: Beispiel-App starten,
Wiedergabe, `onLoad`/`onProgress` im Log der App, Pause/Seek/Stop.

### Phase 3 — Ausbau der Old Architecture (später, als Checkliste)

Wenn die Zeit reif ist, ist das ein reiner Löschvorgang. Diese Liste ist der
eigentliche Zweck von Abschnitt 3 — sie muss bei jeder Änderung gültig bleiben:

- [ ] `ios/RCTVLCPlayerManager.mm` + `.h` löschen.
- [ ] `#ifdef RCT_NEW_ARCH_ENABLED`-Guard in `VlcPlayerComponentView.mm`
      entfernen (Datei bleibt).
- [ ] `android/src/oldarch/` löschen.
- [ ] `sourceSets`-Block aus `android/build.gradle` entfernen, Inhalt von
      `src/newarch/` nach `src/main/` verschieben.
- [ ] CI-Matrix von vier auf zwei Konfigurationen reduzieren.
- [ ] RN-Mindestversion auf 0.76+ anheben, Major-Release.

**Akzeptanzkriterium für Phase 2:** Diese Liste enthält keinen Schritt, der eine
Datei *ändern* statt löschen muss — außer dem Entfernen von Guards. Sobald ein
Punkt „Logik X umschreiben" lauten würde, ist die Isolation verletzt.

### Phase 4 — `playerView` ausgliedern

Ziel: dependency-freier Kern-Player.

Das Control-UI (`playerView/`, 6 Dateien) ist der Grund für Slider und
Vector-Icons und für einen guten Teil der Issues.

- [ ] Entweder eigener Export-Pfad mit `peerDependenciesMeta.optional`,
- [ ] oder Auslagerung in ein separates Package.

### Phase 5 — VLC aktualisieren (Major)

- [ ] iOS/tvOS: `MobileVLCKit`/`TVVLCKit` 3.5.1 → `VLCKit` 4.x (ein XCFramework
      für beide Plattformen).
- [ ] Android: `libvlc-all` 3.6.3 → 4.x, sobald stabil.

**Achtung:** VLCKit 4 bricht die Track-API — `audioTrack`/`textTrack` sind dort
String-Identifier statt `int`. Das ist der Breaking Change an der JS-Oberfläche
und rechtfertigt die Major-Version; Phase 2 tut das nicht.

---

## 5. Verworfene Alternative: Expo Modules API

Die Frage kommt garantiert wieder, daher dokumentiert.

Nicht zu verwechseln mit dem **Config-Plugin** in `expo/` + `app.plugin.js`, das
bereits existiert und Podfile/Gradle patcht. Das ist orthogonal und bleibt.

Non-Expo-Nutzer wären **nicht** ausgeschlossen — `expo-modules-core` läuft in
Bare-RN-Apps (`npx install-expo-modules`). Gegen den Wechsel sprechen vier
Punkte:

1. **Harte Dependency für die gesamte Install-Base**, inklusive Eingriff in
   `MainApplication`/`AppDelegate`. Wer den Schritt vergisst, bekommt Fehler, die
   er nicht zuordnen kann → Support-Last.
2. **Keine generierten TypeScript-Typen.** Expo Modules löst das
   `index.d.ts`-Drift-Problem aus Abschnitt 2 *nicht*. Codegen dreht die
   Richtung: die TS-Spec ist die Quelle, das Native muss sich fügen, sonst
   kompiliert es nicht.
3. **tvOS** ist über `react-native-tvos` möglich, aber deutlich weniger
   ausgetreten als der Codegen-Pfad. Das Package unterstützt tvOS heute.
4. **Rewrite-Umfang.** Expo-Views müssen von `ExpoView` erben, d.h. beide
   Plattform-Cores (~1500 Zeilen fragile Player-Logik) werden angefasst. Der
   Codegen-Plan tauscht nur die Randschicht.

Der stärkste Punkt *für* Expo Modules war „ein Code-Pfad für beide
Architekturen ohne `#ifdef`". Mit dem Core-Adapter-Zuschnitt aus Abschnitt 3
kostet Dual-Arch hier rund 160 Zeilen Adapter — weniger als Punkt 1 wert ist.
Der Vorteil von Swift und weniger Boilerplate bleibt bestehen, wird aber durch
Phase 2b ohnehin größtenteils eingelöst.

**Neu bewerten, wenn:** tvOS-Support aufgegeben wird *und* der Core ohnehin nach
Kotlin/Swift konvertiert ist. Dann schrumpft Punkt 3 und 4 auf null und die
Rechnung kippt.
