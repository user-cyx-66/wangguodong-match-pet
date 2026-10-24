"""Generate a dependency-free Xcode project for the bundled iPhone game."""
from pathlib import Path
import json,plistlib
root=Path(__file__).resolve().parents[1]
project=root/'Wangguodong.xcodeproj';project.mkdir(exist_ok=True)
info={
 'CFBundleDevelopmentRegion':'zh_CN','CFBundleDisplayName':'王果冻的消消小窝',
 'CFBundleExecutable':'$(EXECUTABLE_NAME)','CFBundleIdentifier':'$(PRODUCT_BUNDLE_IDENTIFIER)',
 'CFBundleInfoDictionaryVersion':'6.0','CFBundleName':'$(PRODUCT_NAME)','CFBundlePackageType':'APPL',
 'CFBundleShortVersionString':'3.2.0','CFBundleVersion':'30200','LSRequiresIPhoneOS':True,
 'UILaunchScreen':{'UIColorName':'LaunchBackground'},
 'UISupportedInterfaceOrientations':['UIInterfaceOrientationPortrait','UIInterfaceOrientationLandscapeLeft','UIInterfaceOrientationLandscapeRight'],
 'UIApplicationSceneManifest':{'UIApplicationSupportsMultipleScenes':False,'UISceneConfigurations':{'UIWindowSceneSessionRoleApplication':[{'UISceneConfigurationName':'Default','UISceneDelegateClassName':'$(PRODUCT_MODULE_NAME).SceneDelegate'}]}}
}
(root/'Wangguodong/Info.plist').write_bytes(plistlib.dumps(info))
privacy={'NSPrivacyTracking':False,'NSPrivacyCollectedDataTypes':[],'NSPrivacyAccessedAPITypes':[]}
(root/'Wangguodong/PrivacyInfo.xcprivacy').write_bytes(plistlib.dumps(privacy))
pbx='''// !$*UTF8*$!
{
 archiveVersion = 1; classes = {}; objectVersion = 56;
 objects = {
  A10000000000000000000001 = {isa = PBXBuildFile; fileRef = A20000000000000000000001;};
  A10000000000000000000002 = {isa = PBXBuildFile; fileRef = A20000000000000000000002;};
  A10000000000000000000003 = {isa = PBXBuildFile; fileRef = A20000000000000000000003;};
  A10000000000000000000004 = {isa = PBXBuildFile; fileRef = A20000000000000000000004;};
  A20000000000000000000001 = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = App.swift; sourceTree = "<group>";};
  A20000000000000000000002 = {isa = PBXFileReference; lastKnownFileType = folder; path = game; sourceTree = "<group>";};
  A20000000000000000000003 = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>";};
  A20000000000000000000004 = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>";};
  A20000000000000000000005 = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = Wangguodong.app; sourceTree = BUILT_PRODUCTS_DIR;};
  A30000000000000000000001 = {isa = PBXGroup; children = (A30000000000000000000002,A30000000000000000000003); sourceTree = "<group>";};
  A30000000000000000000002 = {isa = PBXGroup; children = (A20000000000000000000001,A20000000000000000000002,A20000000000000000000003,A20000000000000000000004); path = Wangguodong; sourceTree = "<group>";};
  A30000000000000000000003 = {isa = PBXGroup; children = (A20000000000000000000005); name = Products; sourceTree = "<group>";};
  A40000000000000000000001 = {isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = (A10000000000000000000001); runOnlyForDeploymentPostprocessing = 0;};
  A40000000000000000000002 = {isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = (A10000000000000000000002,A10000000000000000000003,A10000000000000000000004); runOnlyForDeploymentPostprocessing = 0;};
  A40000000000000000000003 = {isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0;};
  A50000000000000000000001 = {isa = PBXNativeTarget; buildConfigurationList = A70000000000000000000002; buildPhases = (A40000000000000000000001,A40000000000000000000003,A40000000000000000000002); buildRules = (); dependencies = (); name = Wangguodong; productName = Wangguodong; productReference = A20000000000000000000005; productType = "com.apple.product-type.application";};
  A60000000000000000000001 = {isa = PBXProject; attributes = {LastUpgradeCheck = 2600; TargetAttributes = {A50000000000000000000001 = {CreatedOnToolsVersion = 26.0;};};}; buildConfigurationList = A70000000000000000000001; compatibilityVersion = "Xcode 14.0"; developmentRegion = zh_CN; hasScannedForEncodings = 0; knownRegions = (zh_CN,en,Base); mainGroup = A30000000000000000000001; productRefGroup = A30000000000000000000003; projectDirPath = ""; projectRoot = ""; targets = (A50000000000000000000001);};
  A70000000000000000000001 = {isa = XCConfigurationList; buildConfigurations = (A80000000000000000000001,A80000000000000000000002); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;};
  A70000000000000000000002 = {isa = XCConfigurationList; buildConfigurations = (A80000000000000000000003,A80000000000000000000004); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;};
  A80000000000000000000001 = {isa = XCBuildConfiguration; buildSettings = {CLANG_ENABLE_MODULES = YES; SDKROOT = iphoneos; IPHONEOS_DEPLOYMENT_TARGET = 15.0; SWIFT_VERSION = 5.0; DEBUG_INFORMATION_FORMAT = dwarf; SWIFT_OPTIMIZATION_LEVEL = "-Onone";}; name = Debug;};
  A80000000000000000000002 = {isa = XCBuildConfiguration; buildSettings = {CLANG_ENABLE_MODULES = YES; SDKROOT = iphoneos; IPHONEOS_DEPLOYMENT_TARGET = 15.0; SWIFT_VERSION = 5.0; DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym"; SWIFT_OPTIMIZATION_LEVEL = "-O"; VALIDATE_PRODUCT = YES;}; name = Release;};
  A80000000000000000000003 = {isa = XCBuildConfiguration; buildSettings = {ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon; CODE_SIGN_STYLE = Automatic; CURRENT_PROJECT_VERSION = 30200; GENERATE_INFOPLIST_FILE = NO; INFOPLIST_FILE = Wangguodong/Info.plist; MARKETING_VERSION = 3.2.0; PRODUCT_BUNDLE_IDENTIFIER = com.cyx.wangguodong.matchpet; PRODUCT_NAME = "$(TARGET_NAME)"; SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"; SWIFT_EMIT_LOC_STRINGS = NO; TARGETED_DEVICE_FAMILY = "1,2"; LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";}; name = Debug;};
  A80000000000000000000004 = {isa = XCBuildConfiguration; buildSettings = {ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon; CODE_SIGN_STYLE = Automatic; CURRENT_PROJECT_VERSION = 30200; GENERATE_INFOPLIST_FILE = NO; INFOPLIST_FILE = Wangguodong/Info.plist; MARKETING_VERSION = 3.2.0; PRODUCT_BUNDLE_IDENTIFIER = com.cyx.wangguodong.matchpet; PRODUCT_NAME = "$(TARGET_NAME)"; SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"; SWIFT_EMIT_LOC_STRINGS = NO; TARGETED_DEVICE_FAMILY = "1,2"; LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";}; name = Release;};
 };
 rootObject = A60000000000000000000001;
}
'''
(project/'project.pbxproj').write_text(pbx,encoding='utf-8')
scheme_dir=project/'xcshareddata/xcschemes';scheme_dir.mkdir(parents=True,exist_ok=True)
(scheme_dir/'Wangguodong.xcscheme').write_text('''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2600" version="1.3"><BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="A50000000000000000000001" BuildableName="Wangguodong.app" BlueprintName="Wangguodong" ReferencedContainer="container:Wangguodong.xcodeproj"/></BuildActionEntry></BuildActionEntries></BuildAction><LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="A50000000000000000000001" BuildableName="Wangguodong.app" BlueprintName="Wangguodong" ReferencedContainer="container:Wangguodong.xcodeproj"/></BuildableProductRunnable></LaunchAction><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/></Scheme>
''',encoding='utf-8')
print('Generated iOS project, Info.plist, privacy declaration and shared build scheme')
