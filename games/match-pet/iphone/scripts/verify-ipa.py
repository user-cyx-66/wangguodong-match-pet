from pathlib import Path
from zipfile import ZipFile
import hashlib,json,plistlib,sys
ipa=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]
with ZipFile(ipa) as z:
 assert z.testzip() is None
 prefix='Payload/Wangguodong.app/'
 info=plistlib.loads(z.read(prefix+'Info.plist'))
 assert info['CFBundleIdentifier']=='com.cyx.wangguodong.matchpet'
 assert info['CFBundleSupportedPlatforms']==['iPhoneOS']
 assert float(info['MinimumOSVersion'])>=15
 binary=z.read(prefix+info['CFBundleExecutable'])
 assert binary[:4] in (b'\xcf\xfa\xed\xfe',b'\xfe\xed\xfa\xcf',b'\xca\xfe\xba\xbe',b'\xbe\xba\xfe\xca')
 count=0
 for p in (root/'Wangguodong/game').rglob('*'):
  if p.is_file(): assert z.read(prefix+'game/'+p.relative_to(root/'Wangguodong/game').as_posix())==p.read_bytes();count+=1
 assert not any(name.endswith('.p12') or name.endswith('.p8') for name in z.namelist())
 report={'file':ipa.name,'bytes':ipa.stat().st_size,'sha256':hashlib.sha256(ipa.read_bytes()).hexdigest(),'platform':'iPhoneOS','minimum_ios':info['MinimumOSVersion'],'bundle_id':info['CFBundleIdentifier'],'assets_verified':count,'signing':'Requires personal signing with the user Apple account before installation; not an App Store or pre-signed IPA'}
 (ipa.parent/'build-report.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
