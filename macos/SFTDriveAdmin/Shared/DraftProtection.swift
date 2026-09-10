import SwiftUI
import AppKit

@MainActor final class DraftRegistry {
    static let shared = DraftRegistry()
    private var drafts: Set<UUID> = []
    var hasChanges: Bool { !drafts.isEmpty }
    func set(_ id: UUID, dirty: Bool) { if dirty { drafts.insert(id) } else { drafts.remove(id) } }
    func confirmDiscard() -> Bool {
        guard hasChanges else { return true }
        let alert = NSAlert(); alert.messageText = "Ungespeicherte Änderungen"
        alert.informativeText = "Zum Speichern bitte zur Bearbeitung zurückkehren. Beim Verwerfen gehen die noch nicht gespeicherten Eingaben verloren."
        alert.addButton(withTitle: "Zur Bearbeitung zurück"); alert.addButton(withTitle: "Änderungen verwerfen")
        return alert.runModal() == .alertSecondButtonReturn
    }
}
private struct DraftProtection: ViewModifier {
    let dirty: Bool
    @State private var id = UUID()
    func body(content: Content) -> some View {
        content.onChange(of: dirty, initial: true) { _, value in DraftRegistry.shared.set(id, dirty: value) }
            .onDisappear { DraftRegistry.shared.set(id, dirty: false) }
    }
}
extension View {
    func protectDraft(_ dirty: Bool) -> some View { modifier(DraftProtection(dirty: dirty)) }
}
@MainActor final class SFTAppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        DraftRegistry.shared.confirmDiscard() ? .terminateNow : .terminateCancel
    }
}
struct WindowCloseGuard: NSViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        DispatchQueue.main.async {
            guard let window = view.window else { return }
            context.coordinator.previous = window.delegate
            window.delegate = context.coordinator
        }
        return view
    }
    func updateNSView(_ nsView: NSView, context: Context) { }
    final class Coordinator: NSObject, NSWindowDelegate {
        weak var previous: NSWindowDelegate?
        func windowShouldClose(_ sender: NSWindow) -> Bool {
            guard DraftRegistry.shared.confirmDiscard() else { return false }
            return previous?.windowShouldClose?(sender) ?? true
        }
        override func responds(to selector: Selector!) -> Bool { super.responds(to: selector) || previous?.responds(to: selector) == true }
        override func forwardingTarget(for selector: Selector!) -> Any? { previous }
    }
}
