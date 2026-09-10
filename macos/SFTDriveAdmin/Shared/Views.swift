import SwiftUI
import AppKit
import UniformTypeIdentifiers

extension Color { static let sftRed = Color(red: 0.91, green: 0.16, blue: 0.20) }
enum Labels {
    static func status(_ value: String) -> String {
        ["draft": "Entwurf", "published": "Veröffentlicht", "registration_closed": "Anmeldung geschlossen", "cancelled": "Abgesagt / Storniert",
         "completed": "Abgeschlossen", "archived": "Archiviert", "confirmed": "Bestätigt", "pending": "Freigabe ausstehend", "waitlisted": "Warteliste",
         "rejected": "Abgelehnt", "automatic": "Automatisch", "manual": "Manuell", "restaurant": "Restaurant", "meeting": "Treffpunkt", "fuel": "Tanken",
         "break": "Pause", "hotel": "Hotel", "viewpoint": "Aussichtspunkt", "other": "Sonstiges"][value] ?? value
    }
}
struct StatusBadge: View {
    let value: String
    var body: some View {
        Text(Labels.status(value)).font(.caption.weight(.medium)).padding(.horizontal, 8).padding(.vertical, 4)
            .background(.quaternary, in: Capsule())
    }
}
struct ErrorBanner: View {
    let message: String?
    var body: some View {
        if let message { Label(message, systemImage: "exclamationmark.triangle").foregroundStyle(.orange).font(.callout).padding().frame(maxWidth: .infinity, alignment: .leading).background(.orange.opacity(0.08)).textSelection(.enabled) }
    }
}
@MainActor class ScreenModel: ObservableObject {
    @Published var error: String?
    @Published var notice: String?
    @Published var busy = false
    @Published var refreshedAt: Date?
    func perform(_ operation: () async throws -> Void) async {
        guard !busy else { return }; busy = true; error = nil
        defer { busy = false }
        do { try await operation(); try Task.checkCancellation(); refreshedAt = Date() }
        catch is CancellationError { }
        catch { self.error = error.localizedDescription }
    }
}
struct RefreshFooter: View {
    let time: Date?
    let busy: Bool
    var body: some View {
        HStack {
            if busy { ProgressView().controlSize(.small); Text("Wird geladen …") }
            else if let time { Text("Aktualisiert \(time.formatted(date: .omitted, time: .standard)) · Änderungen anderer Geräte mit ⌘R laden") }
            else { Text("Noch nicht geladen") }
            Spacer()
        }.font(.caption).foregroundStyle(.secondary).padding(10)
    }
}
struct FormFields: View {
    let fields: [FormField]
    @Binding var values: Payload
    var body: some View {
        ForEach(fields) { field in
            switch field.type {
            case .toggle:
                Toggle(field.title, isOn: Binding(get: { values[field.id]?.boolean ?? field.initial.boolean }, set: { values[field.id] = .bool($0) }))
            case .choice(let options):
                Picker(field.title, selection: text(field)) { ForEach(options, id: \.self) { Text(Labels.status($0)).tag($0) } }
            case .date, .instant:
                VStack(alignment: .leading) {
                    if !field.required {
                        Toggle(field.title, isOn: Binding(get: { !values.text(field.id).isEmpty }, set: { values[field.id] = $0 ? encodedDate(field, Date()) : .null }))
                    }
                    if field.required && values.text(field.id).isEmpty {
                        Button("\(field.title) festlegen") { values[field.id] = encodedDate(field, Date()) }
                    } else if field.required || !values.text(field.id).isEmpty {
                        DatePicker(field.required ? field.title : "Zeitpunkt", selection: date(field), displayedComponents: components(field))
                            .environment(\.timeZone, TourDates.zone)
                    }
                }
            case .multiline:
                VStack(alignment: .leading) { Text(field.title).font(.caption).foregroundStyle(.secondary)
                    TextEditor(text: text(field)).frame(minHeight: 72).font(.body).accessibilityLabel(field.title) }
            default:
                TextField(field.title, text: text(field)).textFieldStyle(.roundedBorder)
            }
        }
    }
    private func text(_ field: FormField) -> Binding<String> {
        Binding(get: { (values[field.id] ?? field.initial).text }, set: { values[field.id] = .string($0) })
    }
    private func components(_ field: FormField) -> DatePickerComponents { if case .date = field.type { return .date }; return [.date, .hourAndMinute] }
    private func encodedDate(_ field: FormField, _ value: Date) -> JSONValue {
        if case .date = field.type { return .string(TourDates.dayString(value)) }
        return .string(ISO8601DateFormatter().string(from: value))
    }
    private func date(_ field: FormField) -> Binding<Date> {
        Binding(get: {
            let text = values.text(field.id)
            if case .date = field.type { return TourDates.day(text) ?? Date() }
            return TourDates.instant(text) ?? Date()
        }, set: { values[field.id] = encodedDate(field, $0) })
    }
}
enum ExportDialog {
    @MainActor static func save(_ content: String, name: String) throws {
        let panel = NSSavePanel(); panel.allowedContentTypes = [.commaSeparatedText]; panel.nameFieldStringValue = name
        guard panel.runModal() == .OK, let url = panel.url else { return }
        try content.write(to: url, atomically: true, encoding: .utf8)
    }
}
