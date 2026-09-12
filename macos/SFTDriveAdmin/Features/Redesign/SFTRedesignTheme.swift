import SwiftUI

// Design-Tokens und Bausteine des Admin-Redesigns.
// Herkunft der Farben: tailwind.config.ts der PWA (sft.black / sft.red / sft.amber ...).
// Hinweis: Color.sftRed existiert bereits in Shared/Views.swift und wird hier NICHT überschrieben.

enum SFT {
    // Flächen
    static let canvas = Color(sftHex: 0x0A0A0A)
    static let chrome = Color(sftHex: 0x0F0F12)
    static let railDeep = Color(sftHex: 0x0D0D10)
    static let card = Color(sftHex: 0x101013)
    static let raised = Color(sftHex: 0x17171B)
    static let control = Color(sftHex: 0x1F1F26)
    static let controlHover = Color(sftHex: 0x2A2A30)

    // Ränder
    static let border = Color.white.opacity(0.08)
    static let borderStrong = Color.white.opacity(0.14)
    static let hairline = Color.white.opacity(0.05)

    // Text
    static let ink = Color(sftHex: 0xF5F5F5)
    static let inkSecondary = Color(sftHex: 0xD8D8D8)
    static let inkTertiary = Color(sftHex: 0x9A9A9A)   // nicht dunkler – Kontrast
    static let decoration = Color(sftHex: 0x3A3A42)

    // Akzente
    static let red = Color(sftHex: 0xE10600)
    static let redHover = Color(sftHex: 0xFF1A12)
    static let redInk = Color(sftHex: 0xFF5A52)
    static let amber = Color(sftHex: 0xF0A500)
    static let amberInk = Color(sftHex: 0xF0C46A)
    static let green = Color(sftHex: 0x35C26A)
    static let greenInk = Color(sftHex: 0x8FE4B4)

    // Radien
    enum Radius {
        static let pill: CGFloat = 6
        static let control: CGFloat = 8
        static let card: CGFloat = 12
        static let sheet: CGFloat = 14
    }

    // Typografie. Archivo / JetBrains Mono müssen dem Target beiliegen,
    // sonst greift automatisch die System-Schrift.
    static func ui(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("Archivo", size: size).weight(weight)
    }

    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("JetBrains Mono", size: size).weight(weight)
    }
}

extension Color {
    init(sftHex hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

// MARK: - Status

enum SFTStatusTone {
    case confirmed, open, blocked, inactive, neutral

    var dot: Color {
        switch self {
        case .confirmed: return SFT.green
        case .open: return SFT.amber
        case .blocked: return SFT.red
        case .inactive: return SFT.decoration
        case .neutral: return SFT.inkTertiary
        }
    }

    var label: Color {
        switch self {
        case .confirmed: return SFT.greenInk
        case .open: return SFT.amberInk
        case .blocked: return SFT.redInk
        case .inactive: return SFT.inkTertiary
        case .neutral: return SFT.inkSecondary
        }
    }

    var fill: Color {
        switch self {
        case .confirmed: return SFT.green.opacity(0.14)
        case .open: return SFT.amber.opacity(0.14)
        case .blocked: return SFT.red.opacity(0.14)
        case .inactive: return .clear
        case .neutral: return Color.white.opacity(0.06)
        }
    }

    var stroke: Color {
        switch self {
        case .confirmed: return SFT.green.opacity(0.35)
        case .open: return SFT.amber.opacity(0.35)
        case .blocked: return SFT.red.opacity(0.40)
        case .inactive: return .clear
        case .neutral: return SFT.border
        }
    }
}

extension SFTStatusTone {
    /// Ordnet die im Projekt verwendeten Status-Strings (Touren, Registrierungen,
    /// Bestellungen, Sperrstatus, …) einer SFT-Statusfarbe zu, damit Tabellen/
    /// Matrizen app-weit dieselbe Semantik verwenden statt einer neutralen
    /// Standardkapsel wie zuvor `StatusBadge`.
    static func forStatus(_ value: String) -> SFTStatusTone {
        switch value {
        case "confirmed", "published", "active", "submitted", "accepted", "true": return .confirmed
        case "pending", "waitlisted", "draft", "registration_closed": return .open
        case "rejected", "cancelled", "archived", "blocked", "banned", "false": return .blocked
        case "completed": return .inactive
        default: return .neutral
        }
    }
}

// MARK: - Bausteine

struct SFTSectionLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(SFT.mono(10, .medium))
            .tracking(1.2)
            .foregroundStyle(SFT.inkTertiary)
    }
}

struct SFTCard<Content: View>: View {
    var padding: CGFloat = 16
    @ViewBuilder var content: Content
    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SFT.card, in: RoundedRectangle(cornerRadius: SFT.Radius.card))
            .overlay(RoundedRectangle(cornerRadius: SFT.Radius.card).strokeBorder(SFT.border))
    }
}

struct SFTStatusPill: View {
    let text: String
    let tone: SFTStatusTone
    var emphasized = false

    var body: some View {
        HStack(spacing: 6) {
            if tone != .inactive {
                Circle().fill(tone.dot).frame(width: 7, height: 7)
            }
            Text(text).font(SFT.mono(10, .semibold)).foregroundStyle(tone.label)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(tone.fill, in: RoundedRectangle(cornerRadius: 7))
        .overlay(
            RoundedRectangle(cornerRadius: 7)
                .strokeBorder(tone.stroke, lineWidth: emphasized ? 1.5 : 1)
        )
    }
}

struct SFTBadge: View {
    let text: String
    let tone: SFTStatusTone
    var body: some View {
        Text(text.uppercased())
            .font(SFT.mono(10, .semibold))
            .foregroundStyle(tone.label)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(tone.fill, in: RoundedRectangle(cornerRadius: 5))
    }
}

/// Kennzahl-Kachel des Dashboards. Aktiv = roter Rand, Bernstein bei Handlungsbedarf.
struct SFTMetricTile: View {
    let title: String
    let value: String
    var needsAction = false
    var isZero = false
    var isActive = false
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                Text(title).font(SFT.ui(11, .medium)).foregroundStyle(SFT.inkTertiary)
                Text(value)
                    .font(SFT.mono(28, .bold))
                    .foregroundStyle(isZero ? SFT.inkTertiary : (needsAction ? SFT.amber : SFT.ink))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                isActive ? SFT.red.opacity(0.14) : SFT.raised,
                in: RoundedRectangle(cornerRadius: 11)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 11)
                    .strokeBorder(isActive ? SFT.red : SFT.border, lineWidth: isActive ? 1.5 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct SFTProgressBar: View {
    let fraction: Double
    var tint: Color = SFT.red
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2).fill(SFT.control)
                RoundedRectangle(cornerRadius: 2)
                    .fill(tint)
                    .frame(width: max(0, min(1, fraction)) * geo.size.width)
            }
        }
        .frame(height: 4)
    }
}

/// Vier Mini-Balken je Tour: Etappen · Stopps · Hotels · Essen.
struct SFTPlanningBars: View {
    let states: [SFTStatusTone]
    var body: some View {
        HStack(spacing: 3) {
            ForEach(Array(states.enumerated()), id: \.offset) { _, tone in
                RoundedRectangle(cornerRadius: 2)
                    .fill(tone == .inactive ? SFT.decoration : tone.dot)
                    .frame(width: 8, height: 14)
            }
        }
    }
}

struct SFTPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(SFT.ui(12, .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                configuration.isPressed ? SFT.redHover : SFT.red,
                in: RoundedRectangle(cornerRadius: 7)
            )
    }
}

struct SFTSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(SFT.ui(12, .semibold))
            .foregroundStyle(SFT.inkSecondary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                configuration.isPressed ? SFT.controlHover : SFT.raised,
                in: RoundedRectangle(cornerRadius: 7)
            )
            .overlay(RoundedRectangle(cornerRadius: 7).strokeBorder(SFT.border))
    }
}

struct SFTAmberButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(SFT.ui(12, .semibold))
            .foregroundStyle(Color(sftHex: 0x181400))
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                configuration.isPressed ? Color(sftHex: 0xFFB81F) : SFT.amber,
                in: RoundedRectangle(cornerRadius: 7)
            )
    }
}

struct SFTSmallButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(SFT.ui(11, .semibold))
            .foregroundStyle(SFT.ink)
            .padding(.horizontal, 11)
            .padding(.vertical, 5)
            .background(
                configuration.isPressed ? SFT.controlHover : SFT.control,
                in: RoundedRectangle(cornerRadius: SFT.Radius.pill)
            )
    }
}

struct SFTDestructiveOutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(SFT.ui(11, .semibold))
            .foregroundStyle(SFT.red)
            .padding(.horizontal, 11)
            .padding(.vertical, 5)
            .background(
                configuration.isPressed ? SFT.red.opacity(0.14) : .clear,
                in: RoundedRectangle(cornerRadius: SFT.Radius.pill)
            )
            .overlay(
                RoundedRectangle(cornerRadius: SFT.Radius.pill)
                    .strokeBorder(SFT.red.opacity(0.4))
            )
    }
}

/// Hinweisfeld in Bernstein / Grün / Rot.
struct SFTNotice: View {
    let text: String
    var tone: SFTStatusTone = .open
    var body: some View {
        Text(text)
            .font(SFT.ui(11))
            .foregroundStyle(tone.label)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(tone.dot.opacity(0.10), in: RoundedRectangle(cornerRadius: SFT.Radius.control))
            .overlay(
                RoundedRectangle(cornerRadius: SFT.Radius.control)
                    .strokeBorder(tone.dot.opacity(0.28))
            )
    }
}

/// Wertefeld im Editor (Anzeige + Bearbeitung über TextField).
struct SFTField<Content: View>: View {
    let label: String
    var mono = false
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(SFT.ui(11, .medium)).foregroundStyle(SFT.inkTertiary)
            content
                .font(mono ? SFT.mono(12) : SFT.ui(12, .medium))
                .foregroundStyle(SFT.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(SFT.raised, in: RoundedRectangle(cornerRadius: SFT.Radius.control))
                .overlay(
                    RoundedRectangle(cornerRadius: SFT.Radius.control)
                        .strokeBorder(SFT.borderStrong)
                )
        }
    }
}

/// Feld ohne Belegung – Import und Editor markieren so „ungeklärt“.
struct SFTUnresolvedField: View {
    let label: String
    let hint: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(SFT.ui(11, .medium)).foregroundStyle(SFT.inkTertiary)
            Text(hint)
                .font(SFT.ui(12, .medium))
                .foregroundStyle(SFT.amber)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(SFT.card, in: RoundedRectangle(cornerRadius: SFT.Radius.control))
                .overlay(
                    RoundedRectangle(cornerRadius: SFT.Radius.control)
                        .strokeBorder(SFT.amber.opacity(0.5), style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
                )
        }
    }
}

struct SFTCheckbox: View {
    let isOn: Bool
    var body: some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(isOn ? SFT.red : .clear)
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .strokeBorder(isOn ? .clear : SFT.decoration, lineWidth: 1.5)
            )
            .frame(width: 15, height: 15)
    }
}

/// Segmentierter Umschalter (Küchenzettel | Teilnehmer, Speisekarte | Hotelangebot).
struct SFTSegmented<Value: Hashable>: View {
    @Binding var selection: Value
    let options: [(value: Value, title: String)]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(options, id: \.value) { option in
                Button { selection = option.value } label: {
                    Text(option.title)
                        .font(SFT.ui(12, .semibold))
                        .foregroundStyle(selection == option.value ? .white : SFT.inkSecondary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 7)
                        .background(
                            selection == option.value ? SFT.red : .clear,
                            in: RoundedRectangle(cornerRadius: SFT.Radius.pill)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(SFT.card, in: RoundedRectangle(cornerRadius: 9))
        .overlay(RoundedRectangle(cornerRadius: 9).strokeBorder(SFT.border))
    }
}

/// Seitentitel mit Unterzeile und rechten Aktionen.
struct SFTPageHeader<Trailing: View, Subtitle: View>: View {
    let title: String
    @ViewBuilder var subtitle: Subtitle
    @ViewBuilder var trailing: Trailing

    var body: some View {
        HStack(alignment: .bottom, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(SFT.ui(26, .bold)).foregroundStyle(SFT.ink)
                subtitle
            }
            Spacer(minLength: 12)
            HStack(spacing: 8) { trailing }
        }
    }
}
