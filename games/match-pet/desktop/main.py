"""Portable Windows game window and transparent desktop companion.

Only bundled HTML and local JSON are used. No backend, startup registration or downloads.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

if '--smoke-report' in sys.argv:
    os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
    os.environ.setdefault('QTWEBENGINE_CHROMIUM_FLAGS', '--disable-gpu --no-sandbox')

from PySide6.QtCore import QObject, QPoint, QLockFile, QTimer, Qt, QUrl, Signal, Slot
from PySide6.QtGui import QAction, QCursor, QFont, QFontDatabase, QIcon, QMovie, QPixmap
from PySide6.QtWebChannel import QWebChannel
from PySide6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineSettings
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QFileDialog, QLabel, QMainWindow, QMenu, QMessageBox, QSystemTrayIcon, QWidget

FROZEN = getattr(sys, 'frozen', False)
RESOURCES = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parents[1]))
PORTABLE_ROOT = Path(sys.executable).parent if FROZEN else Path(__file__).resolve().parents[1]
ASSETS = RESOURCES / 'dist' / 'assets'


def ensure_fonts(app):
    # The Windows font is read in place, never copied into the distribution.
    # This also supports Qt's offscreen platform, which has no font database by default.
    if os.name == 'nt':
        font_path = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts' / 'msyh.ttc'
        if font_path.is_file():
            QFontDatabase.addApplicationFont(str(font_path))
        app.setFont(QFont('Microsoft YaHei', 9))


def default_save():
    return dict(version=1, wallet=15, bond=0, unlocked=0, stars=[0] * 12, ownedRooms=[0], room=0,
                sound=False, sleeping=False, nickname='你', seenIntro=False, session=None, zenBest=0, lettersRead=0)


class Bridge(QObject):
    changed = Signal(str)
    saveError = Signal(str)
    animate = Signal(str)
    revealPet = Signal()

    def __init__(self, data_dir: Path):
        super().__init__()
        self.data_dir = data_dir
        self.path = data_dir / 'save.json'
        self.state = default_save()
        self.read_warning = ''
        if self.path.exists():
            try:
                self.state = self.checked(self.path.read_text(encoding='utf-8'))
            except (OSError, ValueError, TypeError):
                backup = self.data_dir / 'save.backup.json'
                try:
                    self.state = self.checked(backup.read_text(encoding='utf-8'))
                    self.read_warning = '主存档读取失败，已从上一份本地备份恢复。'
                except (OSError, ValueError, TypeError):
                    self.read_warning = '存档读取失败，原文件仍在 data 文件夹，可尝试在游戏设置中导入备份。'

    @staticmethod
    def checked(raw):
        if len(raw) > 1_000_000:
            raise ValueError('存档过大')
        data = json.loads(raw)
        if not isinstance(data, dict) or data.get('version') != 1:
            raise ValueError('不支持的存档')
        for key in ('wallet', 'bond', 'zenBest', 'lettersRead'):
            if type(data.get(key)) is not int or not 0 <= data[key] <= 1_000_000_000:
                raise ValueError('数值错误')
        if not isinstance(data.get('stars'), list) or len(data['stars']) != 12 or any(type(x) is not int or not 0 <= x <= 3 for x in data['stars']):
            raise ValueError('关卡错误')
        return {**default_save(), **data}

    @Slot(result=str)
    def load(self):
        return json.dumps(self.state, ensure_ascii=False)

    @Slot(str, result=bool)
    def save(self, raw):
        try:
            incoming = self.checked(raw)
            tmp = self.path.with_suffix('.tmp')
            tmp.write_text(json.dumps(incoming, ensure_ascii=False, indent=2), encoding='utf-8')
            # Back up known-good in-memory state, never the damaged original.
            (self.data_dir / 'save.backup.json').write_text(json.dumps(self.state, ensure_ascii=False, indent=2), encoding='utf-8')
            tmp.replace(self.path)
            self.state = incoming
            return True
        except (OSError, ValueError, TypeError) as exc:
            self.saveError.emit('自动保存失败：' + str(exc))
            return False

    def update_from_pet(self, action):
        data = {**self.state}
        if action == 'touch':
            if data['sleeping']:
                return '睡得正香呢，喵……'
            data['bond'] += 1
            message = '呼噜呼噜……喜欢你摸摸我。'
        elif action == 'feed':
            if data['wallet'] < 5:
                return '小鱼干不够啦，去消消乐赚一点吧。'
            data['wallet'] -= 5
            data['bond'] += 8
            data['sleeping'] = False
            message = '啊呜！谢谢你的 5 条小鱼干。'
        elif action == 'sleep':
            data['sleeping'] = not data['sleeping']
            message = '呼噜……晚安啦。' if data['sleeping'] else '醒啦！继续陪你。'
        else:
            return ''
        if self.save(json.dumps(data, ensure_ascii=False)):
            self.changed.emit(self.load())
            self.animate.emit('sleep' if data['sleeping'] else action)
            return message
        return '保存失败啦，请看看游戏里的提示。'

    @Slot(str)
    def petAction(self, action):
        self.animate.emit(action)

    @Slot()
    def showPet(self):
        self.revealPet.emit()


class LocalPage(QWebEnginePage):
    def acceptNavigationRequest(self, url, nav_type, main_frame):
        if not main_frame:
            return True
        if url.scheme() != 'file':
            return url.scheme() == 'about'
        try:
            return Path(url.toLocalFile()).resolve().is_relative_to((RESOURCES / 'dist').resolve())
        except (ValueError, OSError):
            return False


class Companion(QWidget):
    def __init__(self, bridge, show_game, quit_app):
        super().__init__()
        self.bridge, self.show_game, self.quit_app = bridge, show_game, quit_app
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setWindowTitle('王果冻 · 桌面陪伴')
        self.resize(230, 234)
        self.label = QLabel(self)
        self.label.setGeometry(25, 47, 180, 180)
        self.label.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self.bubble = QLabel(self)
        self.bubble.setGeometry(3, 4, 224, 40)
        self.bubble.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.bubble.setWordWrap(True)
        self.bubble.setStyleSheet('background:rgba(255,251,237,235); color:#7d705b; border:1px solid #e0d4bd; border-radius:13px; font:11px "Microsoft YaHei"; padding:3px;')
        self.bubble.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self.bubble.setText('你好呀，拖动我，或右键看看。')
        self.movie = None
        self.drag_start = None
        self.dragged = False
        self.last_touch = 0
        self.reset_timer = QTimer(self)
        self.reset_timer.setSingleShot(True)
        self.reset_timer.timeout.connect(self.idle)
        bridge.animate.connect(self.react)
        bridge.changed.connect(lambda _: self.idle())
        bridge.revealPet.connect(self.reveal)
        screen = QApplication.primaryScreen().availableGeometry()
        self.move(screen.right() - self.width() - 40, screen.bottom() - self.height() - 12)
        self.idle()

    def show_image(self, name):
        if self.movie:
            self.movie.stop()
            self.label.setMovie(None)
            self.movie.deleteLater()
            self.movie = None
        path = ASSETS / name
        if path.suffix == '.gif':
            self.movie = QMovie(str(path))
            self.movie.setScaledSize(self.label.size())
            self.label.setMovie(self.movie)
            self.movie.start()
        else:
            self.label.setPixmap(QPixmap(str(path)).scaled(self.label.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))

    def idle(self):
        self.show_image('cat-sleep.png' if self.bridge.state['sleeping'] else 'cat-idle.png')

    def react(self, action):
        if self.bridge.state['sleeping']:
            self.show_image('cat-sleep.png')
            self.bubble.setText('呼噜呼噜……梦里也有你。')
            return
        image = {'skill': 'cat-pounce.gif', 'celebrate': 'cat-dance.gif', 'touch': 'cat-watch.gif', 'feed': 'cat-watch.gif'}.get(action)
        self.show_image(image or 'cat-idle.png')
        messages = {'skill': '猫爪出击！我来帮你。', 'celebrate': '好棒好棒，给你一个猫猫舞！', 'touch': '呼噜呼噜……再摸一下嘛。', 'feed': '啊呜，小鱼干真好吃。', 'wake': '睡醒啦，继续陪你。'}
        self.bubble.setText(messages.get(action, '你慢慢忙，我就在这里。'))
        self.reset_timer.start(4000)

    def reveal(self):
        self.show()
        self.raise_()

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.drag_start = event.globalPosition().toPoint() - self.pos()
            self.dragged = False

    def mouseMoveEvent(self, event):
        if self.drag_start is None or not event.buttons() & Qt.MouseButton.LeftButton:
            return
        target = event.globalPosition().toPoint() - self.drag_start
        if (target - self.pos()).manhattanLength() > 3:
            self.dragged = True
        screen = QApplication.screenAt(event.globalPosition().toPoint()) or QApplication.primaryScreen()
        area = screen.availableGeometry()
        target.setX(max(area.left(), min(area.right() - self.width() + 1, target.x())))
        target.setY(max(area.top(), min(area.bottom() - self.height() + 1, target.y())))
        self.move(target)

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.drag_start = None
            if not self.dragged:
                now = time.monotonic()
                if now - self.last_touch >= 3:
                    self.last_touch = now
                    self.bubble.setText(self.bridge.update_from_pet('touch'))
                else:
                    self.react('touch')

    def mouseDoubleClickEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.show_game()

    def contextMenuEvent(self, event):
        menu = QMenu(self)
        menu.addAction('打开消消小窝', self.show_game)
        menu.addAction('喂 5 条小鱼干（亲密度 +8）', lambda: self.bubble.setText(self.bridge.update_from_pet('feed')))
        menu.addAction('叫醒果冻' if self.bridge.state['sleeping'] else '睡个觉', lambda: self.bubble.setText(self.bridge.update_from_pet('sleep')))
        menu.addSeparator()
        menu.addAction('隐藏桌宠（托盘可找回）', self.hide)
        menu.addAction('退出游戏和桌宠', self.quit_app)
        menu.exec(event.globalPos())


class GameWindow(QMainWindow):
    def __init__(self, bridge, data_dir):
        super().__init__()
        self.setWindowTitle('王果冻的消消小窝')
        self.setWindowIcon(QIcon(str(ASSETS / 'cat-idle.png')))
        self.resize(1380, 940)
        self.setMinimumSize(420, 600)
        self.profile = QWebEngineProfile('MatchPet', self)
        self.profile.setPersistentStoragePath(str(data_dir / 'web-profile'))
        self.profile.setCachePath(str(data_dir / 'web-cache'))
        self.profile.downloadRequested.connect(self.download)
        self.web = QWebEngineView(self)
        self.page = LocalPage(self.profile, self.web)
        self.web.setPage(self.page)
        settings = self.page.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, False)
        self.channel = QWebChannel(self.page)
        self.channel.registerObject('petBridge', bridge)
        self.page.setWebChannel(self.channel)
        self.setCentralWidget(self.web)
        self.web.load(QUrl.fromLocalFile(str(RESOURCES / 'dist' / 'index.html')))
        self.data_dir = data_dir

    def download(self, request):
        path, _ = QFileDialog.getSaveFileName(self, '保存小窝存档', str(self.data_dir / '王果冻-消消小窝存档.json'), 'JSON 存档 (*.json)')
        if path:
            request.setDownloadDirectory(str(Path(path).parent))
            request.setDownloadFileName(Path(path).name)
            request.accept()
        else:
            request.cancel()

    def closeEvent(self, event):
        # Closing the game leaves the companion available; right-click the cat to exit.
        self.page.runJavaScript('window.MatchPetUI && window.MatchPetUI.persist()')
        self.hide()
        event.ignore()

    def reveal(self):
        self.showNormal()
        self.raise_()
        self.activateWindow()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', type=Path)
    parser.add_argument('--smoke-report', type=Path)
    parser.add_argument('--screenshot', type=Path)
    options = parser.parse_args()
    if options.smoke_report:
        os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
        os.environ.setdefault('QTWEBENGINE_CHROMIUM_FLAGS', '--disable-gpu --no-sandbox')
    app = QApplication(sys.argv[:1])
    ensure_fonts(app)
    app.setApplicationName('王果冻的消消小窝')
    app.setQuitOnLastWindowClosed(False)
    data_dir = options.data_dir or PORTABLE_ROOT / 'data'
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        QMessageBox.critical(None, '无法保存进度', '请先完整解压到可写入的文件夹，再启动游戏。\n' + str(exc))
        return 2
    lock = QLockFile(str(data_dir / 'session.lock'))
    if not lock.tryLock(100):
        QMessageBox.information(None, '小窝已经打开啦', '可在任务栏、桌面上的果冻，或右下角托盘找回游戏。')
        return 0
    bridge = Bridge(data_dir)
    window = GameWindow(bridge, data_dir)
    pet = Companion(bridge, window.reveal, app.quit)
    tray = QSystemTrayIcon(QIcon(str(ASSETS / 'cat-idle.png')), app)
    tray.setToolTip('王果冻的消消小窝 · 右键菜单可退出')
    tray_menu = QMenu()
    tray_menu.addAction('打开消消小窝', window.reveal)
    tray_menu.addAction('找回桌宠', pet.reveal)
    tray_menu.addAction('退出游戏和桌宠', app.quit)
    tray.setContextMenu(tray_menu)
    tray.activated.connect(lambda reason: window.reveal() if reason == QSystemTrayIcon.ActivationReason.DoubleClick else None)
    tray.show()
    window.show()
    pet.show()
    if bridge.read_warning and not options.smoke_report:
        QTimer.singleShot(1500, lambda: QMessageBox.information(window, '存档提示', bridge.read_warning))
    if options.smoke_report:
        attempts = [0]

        def check():
            attempts[0] += 1

            def result(value):
                if isinstance(value, str):
                    try:
                        value = json.loads(value)
                    except ValueError:
                        value = None
                if not value and attempts[0] < 20:
                    QTimer.singleShot(500, check)
                    return
                pet.react('celebrate')
                report = {'ready': bool(value), 'web': value, 'petVisible': pet.isVisible(), 'transparent': pet.testAttribute(Qt.WidgetAttribute.WA_TranslucentBackground), 'bridgeWallet': bridge.state['wallet'], 'animationValid': bool(pet.movie and pet.movie.isValid()), 'chineseFontAvailable': 'Microsoft YaHei' in QFontDatabase.families(), 'assetsPresent': all((ASSETS / name).exists() for name in ['cat-idle.png', 'cat-sleep.png', 'cat-watch.gif', 'cat-pounce.gif', 'cat-dance.gif'])}
                if options.screenshot:
                    window.grab().save(str(options.screenshot))
                options.smoke_report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
                app.exit(0 if report['ready'] and report['assetsPresent'] else 3)

            window.page.runJavaScript('window.MatchPetUI ? JSON.stringify({tiles:document.querySelectorAll(".tile").length, native:!!window.qt, title:document.title, wallet:MatchPetUI.state.wallet}) : null', result)

        QTimer.singleShot(1500, check)
        QTimer.singleShot(20000, lambda: app.exit(4))
    code = app.exec()
    pet.hide()
    tray.hide()
    window.web.setPage(None)
    window.page.deleteLater()
    lock.unlock()
    return code


if __name__ == '__main__':
    raise SystemExit(main())
