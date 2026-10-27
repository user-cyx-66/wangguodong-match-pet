import UIKit
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default", sessionRole: session.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = GameController()
        self.window = window
        window.makeKeyAndVisible()
    }
    func sceneWillResignActive(_ scene: UIScene) { (window?.rootViewController as? GameController)?.setActive(false) }
    func sceneDidBecomeActive(_ scene: UIScene) { (window?.rootViewController as? GameController)?.setActive(true) }
}

final class LocalGameScheme: NSObject, WKURLSchemeHandler {
    private let root = Bundle.main.bundleURL.appendingPathComponent("game", isDirectory: true).standardizedFileURL
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.scheme == "matchpet", url.host == "localhost", task.request.httpMethod == "GET" else {
            task.didFailWithError(NSError(domain: "MatchPet", code: 403)); return
        }
        let path = url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
            task.didFailWithError(NSError(domain: "MatchPet", code: 404)); return
        }
        let types = ["html":"text/html", "js":"application/javascript", "css":"text/css", "json":"application/json", "png":"image/png", "gif":"image/gif", "svg":"image/svg+xml"]
        task.didReceive(URLResponse(url: url, mimeType: types[file.pathExtension] ?? "application/octet-stream", expectedContentLength: data.count, textEncodingName: "utf-8"))
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) { }
}

final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var owner: GameController?
    init(_ owner: GameController) { self.owner = owner }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) { owner?.receive(message) }
}

final class GameController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var web: WKWebView!
    private let cream = UIColor(red: 251/255, green: 246/255, blue: 238/255, alpha: 1)
    private let bridge = """
    (() => {
      window.MatchPetNative = Object.freeze({
        version: () => '3.2.0',
        exportSave: json => window.webkit.messageHandlers.matchpet.postMessage({type:'export', json:String(json)})
      });
    })();
    """
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = cream
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.setURLSchemeHandler(LocalGameScheme(), forURLScheme: "matchpet")
        config.userContentController.add(WeakMessageHandler(self), name: "matchpet")
        var startScript = bridge
        #if targetEnvironment(simulator)
        if ProcessInfo.processInfo.environment["MATCHPET_SMOKE"] == "1" {
            startScript += """
            document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
              let saved = false; try { saved = !!localStorage.getItem('wangguodong.matchpet.v1'); } catch (_) {}
              window.webkit.messageHandlers.matchpet.postMessage({type:'ready', boardCount:document.querySelectorAll('#board [data-index]').length, saved:saved, native:!!window.MatchPetNative});
            }, 800));
            """
        }
        #endif
        config.userContentController.addUserScript(WKUserScript(source: startScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = .all
        web = WKWebView(frame: .zero, configuration: config)
        web.backgroundColor = cream
        web.isOpaque = false
        web.navigationDelegate = self
        web.uiDelegate = self
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
        web.load(URLRequest(url: URL(string: "matchpet://localhost/index.html")!))
    }
    override var preferredStatusBarStyle: UIStatusBarStyle { .darkContent }
    func setActive(_ active: Bool) {
        guard web != nil else { return }
        let method = active ? "resume" : "pause"
        web.evaluateJavaScript("window.MatchPetNativeEvents && window.MatchPetNativeEvents.\(method)()", completionHandler: nil)
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        decisionHandler(url.scheme == "matchpet" && url.host == "localhost" ? .allow : .cancel)
    }
    func receive(_ message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == "matchpet",
              message.frameInfo.request.url?.host == "localhost",
              let body = message.body as? [String: Any] else { return }
        #if targetEnvironment(simulator)
        if body["type"] as? String == "ready", ProcessInfo.processInfo.environment["MATCHPET_SMOKE"] == "1",
           let data = try? JSONSerialization.data(withJSONObject: body, options: [.prettyPrinted]),
           let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            try? data.write(to: documents.appendingPathComponent("native-smoke.json"), options: .atomic)
            return
        }
        #endif
        guard body["type"] as? String == "export", let json = body["json"] as? String, let data = json.data(using: .utf8), data.count <= 1_000_000,
              (try? JSONSerialization.jsonObject(with: data)) is [String: Any] else { return }
        export(data)
    }
    private func export(_ data: Data) {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        let file = directory.appendingPathComponent("王果冻-消消小窝存档.json")
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try data.write(to: file, options: .atomic)
            let controller = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            controller.popoverPresentationController?.sourceView = view
            controller.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            controller.completionWithItemsHandler = { [weak self] _, complete, _, error in
                let text = complete ? "存档已分享，请确认保存的位置" : "已关闭分享，原存档仍然保留"
                self?.notifyExport(complete && error == nil, text)
                try? FileManager.default.removeItem(at: directory)
            }
            present(controller, animated: true)
        } catch { notifyExport(false, "导出未完成，请稍后重试") }
    }
    private func notifyExport(_ success: Bool, _ text: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: [success, text]), let values = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.MatchPetNativeEvents && window.MatchPetNativeEvents.exportResult.apply(null,\(values))", completionHandler: nil)
    }
}
