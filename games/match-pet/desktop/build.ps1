param([string]$PythonExe = 'python')
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$cacheDir = Join-Path $projectDir '.build'
$env:PYINSTALLER_CONFIG_DIR = Join-Path $cacheDir 'config'
& $PythonExe -m PyInstaller --noconfirm --windowed --name '王果冻的消消小窝' --icon (Join-Path $PSScriptRoot 'cat.ico') --add-data ((Join-Path $projectDir 'dist') + ';dist') --exclude-module numpy --exclude-module onnxruntime --exclude-module PIL --exclude-module tkinter --distpath (Join-Path $cacheDir 'release') --workpath (Join-Path $cacheDir 'cache') --specpath $cacheDir (Join-Path $PSScriptRoot 'main.py')
if ($LASTEXITCODE -ne 0) { throw '打包失败，请查看上方日志。' }
# Qt 6.10 Windows wheels use the OS ICU ABI. A Python runtime may carry ICU 78
# with version-suffixed exports; PyInstaller can mistakenly collect it first.
$nativeInternal = Join-Path $cacheDir 'release\王果冻的消消小窝\_internal'
foreach ($library in @('icuuc.dll', 'icudt78.dll')) {
    $candidate = Join-Path $nativeInternal $library
    if (Test-Path -LiteralPath $candidate) { Remove-Item -LiteralPath $candidate }
}
Write-Output ('打包完成：' + (Join-Path $cacheDir 'release\王果冻的消消小窝'))
