import Foundation

// Platzhalterdaten für Xcode-Previews und für die Abnahme des Layouts.
// In der App werden dieselben Strukturen aus den Repositories gefüllt —
// diese Datei darf dann aus dem Target genommen werden.

enum SFTRedesignSample {
    static let tours: [TourRow] = [
        TourRow(
            id: "alpen", title: "Alpen Grand Tour",
            subtitle: "5 Etappen · 4 Nächte · 2 Restaurants",
            dateRange: "12.–16.06.", region: "Alpen",
            confirmedVehicles: 18, maxVehicles: 22, lifecycle: .live,
            planning: [.done, .open, .open, .done]
        ),
        TourRow(
            id: "schwarzwald", title: "Schwarzwald Hochstraße",
            subtitle: "3 Etappen · 3 Nächte · 1 Restaurant",
            dateRange: "09.–12.05.", region: "Schwarzwald",
            confirmedVehicles: 14, maxVehicles: 18, lifecycle: .registration,
            planning: [.done, .done, .open, .missing]
        ),
        TourRow(
            id: "eifel", title: "Eifel Frühjahrsausfahrt",
            subtitle: "2 Etappen · 1 Nacht · 1 Restaurant",
            dateRange: "18.–19.04.", region: "Eifel",
            confirmedVehicles: 21, maxVehicles: 21, lifecycle: .live,
            planning: [.done, .done, .done, .done]
        ),
        TourRow(
            id: "sauerland", title: "Sauerland Tagestour",
            subtitle: "1 Etappe · keine Nacht · 1 Restaurant",
            dateRange: "05.07.", region: "Sauerland",
            confirmedVehicles: 9, maxVehicles: 16, lifecycle: .registration,
            planning: [.done, .missing, .open, .missing]
        ),
        TourRow(
            id: "dolomiten", title: "Dolomiten Herbst",
            subtitle: "aus Vorlage „Mehrtagestour Alpen“",
            dateRange: "18.–22.09.", region: "Dolomiten",
            confirmedVehicles: nil, maxVehicles: 20, lifecycle: .draft,
            planning: [.done, .missing, .missing, .missing]
        )
    ]

    static let seasonBars: [SeasonBar] = [
        SeasonBar(id: "b1", tourID: "eifel", title: "Eifel Frühjahr · 18.–19.4.", startColumn: 1, span: 2, lifecycle: .live),
        SeasonBar(id: "b2", tourID: "schwarzwald", title: "Schwarzwald Hochstraße · 9.–12.5.", startColumn: 3, span: 3, lifecycle: .registration),
        SeasonBar(id: "b3", tourID: "alpen", title: "Alpen Grand Tour · 12.–16.6.", startColumn: 6, span: 3, lifecycle: .live),
        SeasonBar(id: "b4", tourID: "sauerland", title: "Sauerland", startColumn: 9, span: 1, lifecycle: .registration),
        SeasonBar(id: "b5", tourID: "dolomiten", title: "Dolomiten · Entwurf", startColumn: 11, span: 2, lifecycle: .draft),
        SeasonBar(id: "b6", tourID: "harz", title: "Harz Abschluss", startColumn: 13, span: 2, lifecycle: .draft)
    ]

    static let metricValues: [RedesignDashboardMetric: Int] = [
        .pendingVehicles: 7, .waitlist: 12, .accommodation: 9,
        .meals: 14, .checkIn: 0, .deadlines: 3
    ]

    static let registrations: [RegistrationRow] = [
        RegistrationRow(id: "r1", name: "Markus Behrend", username: "m.behrend",
                        vehicle: "Porsche 911 GT3 · 510 PS · 2 Personen",
                        tourTitle: "Alpen Grand Tour", status: "pending"),
        RegistrationRow(id: "r2", name: "Sabine Korte", username: "s.korte",
                        vehicle: "BMW M4 Competition · 510 PS · 1 Person",
                        tourTitle: "Alpen Grand Tour", status: "pending"),
        RegistrationRow(id: "r3", name: "Tobias Reinhardt", username: "t.reinhardt",
                        vehicle: "Audi RS3 · 400 PS · 2 Personen",
                        tourTitle: "Schwarzwald Hochstr.", status: "pending"),
        RegistrationRow(id: "r4", name: "Jana Wolters", username: "j.wolters",
                        vehicle: "Mercedes-AMG A45 · 421 PS · 1 Person",
                        tourTitle: "Schwarzwald Hochstr.", status: "pending"),
        RegistrationRow(id: "r5", name: "Peter Lindqvist", username: "p.lindqvist",
                        vehicle: "Porsche Cayman GT4 · 420 PS · 1 Person",
                        tourTitle: "Alpen Grand Tour", status: "waitlisted")
    ]

    static let deadlines: [DeadlineRow] = [
        DeadlineRow(id: "d1", title: "Essensbestellung Berggasthof",
                    context: "Alpen Grand Tour · morgen 18:00", isUrgent: true),
        DeadlineRow(id: "d2", title: "Hotelkontingent Alpenhof",
                    context: "Alpen Grand Tour · in 4 Tagen", isUrgent: false),
        DeadlineRow(id: "d3", title: "Anmeldeschluss",
                    context: "Sauerland Tagestour · in 6 Tagen", isUrgent: false)
    ]

    static let activity: [ActivityRow] = [
        ActivityRow(id: "a1", actor: "S. Korte", text: "hat Hotel rückbestätigt", time: "14:21"),
        ActivityRow(id: "a2", actor: "M. Behrend", text: "fragt Teilnahme an", time: "13:58"),
        ActivityRow(id: "a3", actor: "4 Teilnehmer", text: "haben Essen bestellt", time: "12:40")
    ]

    static let nextTour = NextTourCard(
        tourID: "alpen", title: "Alpen Grand Tour",
        meta: "Alpen · 12.–16. Juni · 1 240 km",
        vehicles: "18 / 22", people: "31", nights: "13 / 18", orders: "11 / 18",
        nightsNeedAction: true, ordersNeedAction: true
    )

    static let templates: [TourTemplate] = [
        TourTemplate(id: "tpl-alpen", title: "Mehrtagestour Alpen",
                     summary: "5 Etappen · 2 Hotels · 2 Restaurants", usageCount: 4),
        TourTemplate(id: "tpl-tages", title: "Tagestour Mittelgebirge",
                     summary: "1 Etappe · 1 Restaurant · Regeln", usageCount: 9),
        TourTemplate(id: "tpl-wochenende", title: "Wochenende + Hotel",
                     summary: "2 Etappen · 1 Nacht · Konditionen", usageCount: 6)
    ]

    static let editorDraft = TourEditorDraft(
        title: "Alpen Grand Tour",
        slug: "alpen-grand-tour-2026",
        startDate: "12.06.2026", endDate: "16.06.2026", meetingAt: "07:30",
        region: "Alpen", maxVehicles: 22, routeLength: "1 240 km",
        confirmationMode: "manual",
        registrationOpenAt: "01.03.2026 · 18:00",
        registrationCloseAt: "25.05.2026 · 23:59",
        statusText: "Entwurf", updatedAt: "14:12",
        completedSections: 5, shiftedFromTemplate: true,
        sectionStates: [
            "Basisdaten": "done", "Regeln & Anmeldung": "done", "Etappen": "done",
            "Stopps": "open", "Hotels": "open", "Restaurants": "done",
            "Import aus Angebot": "missing", "Texte & Bilder": "missing",
            "Veröffentlichung": "missing"
        ],
        sectionNotes: ["Etappen": "5", "Stopps": "7", "Hotels": "offen", "Restaurants": "2"],
        openItems: ["Hotel für Nacht 3 fehlt", "2 Stopps ohne Adresse", "Cover-Bild fehlt"]
    )

    // MARK: Hotelplanung

    static func hotelPlan(for tourID: String) -> HotelPlan {
        switch tourID {
        case "schwarzwald":
            return HotelPlan(
                subtitle: "Schwarzwald · 9.–12. Mai · 3 Nächte · 14 bestätigte Fahrzeuge",
                openConfirmations: 2,
                nights: [
                    HotelNightColumn(id: "2026-05-09", weekday: "SA", date: "09.05."),
                    HotelNightColumn(id: "2026-05-10", weekday: "SO", date: "10.05."),
                    HotelNightColumn(id: "2026-05-11", weekday: "MO", date: "11.05.")
                ],
                capacities: [
                    HotelCapacityCard(id: "c1", hotelAndNight: "Hirschen · Sa", confirmed: 14, expected: 14, allotment: 16),
                    HotelCapacityCard(id: "c2", hotelAndNight: "Hirschen · So", confirmed: 12, expected: 14, allotment: 16),
                    HotelCapacityCard(id: "c3", hotelAndNight: "Waldhotel · Mo", confirmed: 14, expected: 14, allotment: 18)
                ],
                rows: [
                    HotelMatrixRow(id: "u1", participant: "Tobias Reinhardt", vehicle: "Audi RS3 · 2 P.", cells: [
                        HotelCell(id: "u1-1", nightID: "2026-05-09", state: .confirmed(code: "HIR")),
                        HotelCell(id: "u1-2", nightID: "2026-05-10", state: .confirmed(code: "HIR")),
                        HotelCell(id: "u1-3", nightID: "2026-05-11", state: .confirmed(code: "WAL"))
                    ], trailingAction: .complete),
                    HotelMatrixRow(id: "u2", participant: "Jana Wolters", vehicle: "AMG A45 · 1 P.", cells: [
                        HotelCell(id: "u2-1", nightID: "2026-05-09", state: .confirmed(code: "HIR")),
                        HotelCell(id: "u2-2", nightID: "2026-05-10", state: .pending(code: nil), detail: HotelCellDetail(
                            participant: "Jana Wolters", night: "So 10.05.", hotel: "Gasthof Hirschen",
                            roomType: "EZ", priceLine: "98 € / Nacht · Frühstück inkl.",
                            termsLine: "Kontingent bis 02.05. · stornierbar bis 05.05.",
                            statusNote: "Teilnehmer hat noch nicht rückbestätigt · erinnert am 28.04.",
                            isConfirmed: false
                        )),
                        HotelCell(id: "u2-3", nightID: "2026-05-11", state: .confirmed(code: "WAL"))
                    ], trailingAction: .remind),
                    HotelMatrixRow(id: "u3", participant: "Katrin Mühlbauer", vehicle: "Alpine A110 · 1 P.", cells: [
                        HotelCell(id: "u3-1", nightID: "2026-05-09", state: .confirmed(code: "HIR")),
                        HotelCell(id: "u3-2", nightID: "2026-05-10", state: .pending(code: nil), detail: HotelCellDetail(
                            participant: "Katrin Mühlbauer", night: "So 10.05.", hotel: "Gasthof Hirschen",
                            roomType: "EZ", priceLine: "98 € / Nacht · Frühstück inkl.",
                            termsLine: "Kontingent bis 02.05.",
                            statusNote: "noch nicht rückbestätigt",
                            isConfirmed: false
                        )),
                        HotelCell(id: "u3-3", nightID: "2026-05-11", state: .privateStay)
                    ], trailingAction: .remind),
                    HotelMatrixRow(id: "u4", participant: "Erik Sandmann", vehicle: "BMW M2 · 2 P.", cells: [
                        HotelCell(id: "u4-1", nightID: "2026-05-09", state: .confirmed(code: "HIR")),
                        HotelCell(id: "u4-2", nightID: "2026-05-10", state: .confirmed(code: "HIR")),
                        HotelCell(id: "u4-3", nightID: "2026-05-11", state: .confirmed(code: "WAL"))
                    ], trailingAction: .complete)
                ],
                legendNote: "4 von 14 Fahrzeugen · HIR = Gasthof Hirschen · WAL = Waldhotel Sonnenberg"
            )
        default:
            return HotelPlan(
                subtitle: "Alpen · 12.–16. Juni · 4 Nächte · 18 bestätigte Fahrzeuge",
                openConfirmations: 9,
                nights: [
                    HotelNightColumn(id: "2026-06-12", weekday: "DO", date: "12.06."),
                    HotelNightColumn(id: "2026-06-13", weekday: "FR", date: "13.06."),
                    HotelNightColumn(id: "2026-06-14", weekday: "SA", date: "14.06."),
                    HotelNightColumn(id: "2026-06-15", weekday: "SO", date: "15.06.")
                ],
                capacities: [
                    HotelCapacityCard(id: "c1", hotelAndNight: "Alpenhof · Do", confirmed: 16, expected: 18, allotment: 20),
                    HotelCapacityCard(id: "c2", hotelAndNight: "Alpenhof · Fr", confirmed: 13, expected: 18, allotment: 20),
                    HotelCapacityCard(id: "c3", hotelAndNight: "Sporthotel · Sa", confirmed: 12, expected: 18, allotment: 14),
                    HotelCapacityCard(id: "c4", hotelAndNight: "Sporthotel · So", confirmed: 15, expected: 18, allotment: 14)
                ],
                rows: [
                    HotelMatrixRow(id: "u1", participant: "Markus Behrend", vehicle: "Porsche 911 GT3 · 2 P.", cells: [
                        HotelCell(id: "m1", nightID: "2026-06-12", state: .confirmed(code: "ALP")),
                        HotelCell(id: "m2", nightID: "2026-06-13", state: .confirmed(code: "ALP")),
                        HotelCell(id: "m3", nightID: "2026-06-14", state: .confirmed(code: "SPO")),
                        HotelCell(id: "m4", nightID: "2026-06-15", state: .confirmed(code: "SPO"))
                    ], trailingAction: .complete),
                    HotelMatrixRow(id: "u2", participant: "Sabine Korte", vehicle: "BMW M4 · 1 P.", cells: [
                        HotelCell(id: "s1", nightID: "2026-06-12", state: .confirmed(code: "ALP")),
                        HotelCell(id: "s2", nightID: "2026-06-13", state: .pending(code: "ALP"), detail: HotelCellDetail(
                            participant: "Sabine Korte", night: "Fr 13.06.", hotel: "Hotel Alpenhof",
                            roomType: "DZ zur Einzelnutzung",
                            priceLine: "142 € / Nacht · Frühstück inkl. · Tiefgarage 12 €",
                            termsLine: "Kontingent bis 08.06. · kostenfrei stornierbar bis 10.06.",
                            statusNote: "Teilnehmer hat noch nicht rückbestätigt · erinnert am 04.06.",
                            isConfirmed: false
                        )),
                        HotelCell(id: "s3", nightID: "2026-06-14", state: .pending(code: nil), detail: HotelCellDetail(
                            participant: "Sabine Korte", night: "Sa 14.06.", hotel: "Sporthotel Zugspitze",
                            roomType: "EZ", priceLine: "128 € / Nacht · Frühstück inkl.",
                            termsLine: "Kontingent bis 08.06.",
                            statusNote: "noch keine Auswahl getroffen", isConfirmed: false
                        )),
                        HotelCell(id: "s4", nightID: "2026-06-15", state: .privateStay)
                    ], trailingAction: .remind),
                    HotelMatrixRow(id: "u3", participant: "Tobias Reinhardt", vehicle: "Audi RS3 · 2 P.", cells: [
                        HotelCell(id: "t1", nightID: "2026-06-12", state: .confirmed(code: "ALP")),
                        HotelCell(id: "t2", nightID: "2026-06-13", state: .confirmed(code: "ALP")),
                        HotelCell(id: "t3", nightID: "2026-06-14", state: .pending(code: nil), detail: HotelCellDetail(
                            participant: "Tobias Reinhardt", night: "Sa 14.06.", hotel: "Sporthotel Zugspitze",
                            roomType: "DZ", priceLine: "156 € / Nacht · Frühstück inkl.",
                            termsLine: "Kontingent bis 08.06.",
                            statusNote: "noch nicht rückbestätigt", isConfirmed: false
                        )),
                        HotelCell(id: "t4", nightID: "2026-06-15", state: .confirmed(code: "SPO"))
                    ], trailingAction: .remind),
                    HotelMatrixRow(id: "u4", participant: "Jana Wolters", vehicle: "AMG A45 · 1 P.", cells: [
                        HotelCell(id: "j1", nightID: "2026-06-12", state: .confirmed(code: "ALP")),
                        HotelCell(id: "j2", nightID: "2026-06-13", state: .privateStay),
                        HotelCell(id: "j3", nightID: "2026-06-14", state: .privateStay),
                        HotelCell(id: "j4", nightID: "2026-06-15", state: .confirmed(code: "SPO"))
                    ], trailingAction: .complete),
                    HotelMatrixRow(id: "u5", participant: "Dirk Aslan", vehicle: "Lotus Emira · 2 P.", cells: [
                        HotelCell(id: "d1", nightID: "2026-06-12", state: .pending(code: nil), detail: HotelCellDetail(
                            participant: "Dirk Aslan", night: "Do 12.06.", hotel: "Hotel Alpenhof",
                            roomType: "DZ", priceLine: "168 € / Nacht · Frühstück inkl.",
                            termsLine: "Kontingent bis 08.06.",
                            statusNote: "noch nicht rückbestätigt", isConfirmed: false
                        )),
                        HotelCell(id: "d2", nightID: "2026-06-13", state: .pending(code: nil)),
                        HotelCell(id: "d3", nightID: "2026-06-14", state: .confirmed(code: "SPO")),
                        HotelCell(id: "d4", nightID: "2026-06-15", state: .confirmed(code: "SPO"))
                    ], trailingAction: .remind),
                    HotelMatrixRow(id: "u6", participant: "Peter Lindqvist", vehicle: "Porsche Cayman GT4 · 1 P.", cells: [
                        HotelCell(id: "p1", nightID: "2026-06-12", state: .confirmed(code: "ALP")),
                        HotelCell(id: "p2", nightID: "2026-06-13", state: .confirmed(code: "ALP")),
                        HotelCell(id: "p3", nightID: "2026-06-14", state: .waitlisted),
                        HotelCell(id: "p4", nightID: "2026-06-15", state: .confirmed(code: "SPO"))
                    ], trailingAction: .rebook)
                ],
                legendNote: "6 von 18 Fahrzeugen · ALP = Alpenhof · SPO = Sporthotel Zugspitze"
            )
        }
    }

    // MARK: Essensplanung

    static func mealPlan(for tourID: String) -> MealPlan {
        switch tourID {
        case "schwarzwald":
            return MealPlan(
                stops: [RestaurantStopChip(id: "s1", title: "Landgasthof Sonne · Sa 19:00")],
                summary: MealSummary(
                    orderedVehicles: 14, confirmedVehicles: 14, dishes: 21,
                    vegetarian: 6, vegan: 1, total: 494,
                    deadlineText: "07.05. 18:00", deadlineIsUrgent: false
                ),
                menu: [
                    MenuLine(id: "m1", name: "Badischer Sauerbraten", count: 8, price: 27,
                             isVegetarian: false, isVegan: false, allergenNote: nil),
                    MenuLine(id: "m2", name: "Forelle Müllerin", count: 6, price: 24,
                             isVegetarian: false, isVegan: false, allergenNote: nil),
                    MenuLine(id: "m3", name: "Maultaschen mit Rahmsoße", count: 6, price: Decimal(string: "19.50")!,
                             isVegetarian: true, isVegan: false, allergenNote: nil),
                    MenuLine(id: "m4", name: "Linsensalat mit Ofengemüse", count: 1, price: 17,
                             isVegetarian: true, isVegan: true, allergenNote: nil)
                ],
                orders: [
                    ParticipantOrder(id: "o1", participant: "Tobias Reinhardt", detail: "2 Personen",
                                     order: "2× Badischer Sauerbraten", total: 54),
                    ParticipantOrder(id: "o2", participant: "Jana Wolters", detail: "1 Person",
                                     order: "1× Maultaschen", total: Decimal(string: "19.50")!),
                    ParticipantOrder(id: "o3", participant: "Katrin Mühlbauer", detail: "1 Person · vegan",
                                     order: "1× Linsensalat mit Ofengemüse", total: 17),
                    ParticipantOrder(id: "o4", participant: "Erik Sandmann", detail: "2 Personen",
                                     order: "1× Forelle Müllerin · 1× Maultaschen", total: Decimal(string: "43.50")!)
                ],
                kitchenFooter: "21 Gerichte · alle 14 Fahrzeuge haben bestellt",
                guestFooter: "4 von 14 Fahrzeugen · alle haben bestellt",
                openOrders: 0
            )
        default:
            return MealPlan(
                stops: [
                    RestaurantStopChip(id: "s1", title: "Berggasthof Lärchenhof · Fr 19:30"),
                    RestaurantStopChip(id: "s2", title: "Almstube Kranzberg · So 12:30")
                ],
                summary: MealSummary(
                    orderedVehicles: 11, confirmedVehicles: 18, dishes: 19,
                    vegetarian: 5, vegan: 2, total: 438,
                    deadlineText: "morgen 18:00", deadlineIsUrgent: true
                ),
                menu: [
                    MenuLine(id: "m1", name: "Rinderfilet mit Rosmarinkartoffeln", count: 6, price: 32,
                             isVegetarian: false, isVegan: false, allergenNote: nil),
                    MenuLine(id: "m2", name: "Kalbsschnitzel Wiener Art", count: 4, price: Decimal(string: "26.50")!,
                             isVegetarian: false, isVegan: false, allergenNote: nil),
                    MenuLine(id: "m3", name: "Käsespätzle", count: 5, price: 18,
                             isVegetarian: true, isVegan: false, allergenNote: "Laktose"),
                    MenuLine(id: "m4", name: "Gemüsecurry mit Reis", count: 2, price: Decimal(string: "19.50")!,
                             isVegetarian: true, isVegan: true, allergenNote: nil),
                    MenuLine(id: "m5", name: "Apfelstrudel", count: 2, price: Decimal(string: "5.50")!,
                             isVegetarian: true, isVegan: false, allergenNote: "Nuss")
                ],
                orders: [
                    ParticipantOrder(id: "o1", participant: "Markus Behrend", detail: "2 Personen",
                                     order: "2× Rinderfilet · 1× Apfelstrudel", total: Decimal(string: "69.50")!),
                    ParticipantOrder(id: "o2", participant: "Sabine Korte", detail: "1 Person · Laktose",
                                     order: "1× Gemüsecurry", total: Decimal(string: "19.50")!),
                    ParticipantOrder(id: "o3", participant: "Tobias Reinhardt", detail: "2 Personen",
                                     order: nil, total: nil),
                    ParticipantOrder(id: "o4", participant: "Jana Wolters", detail: "1 Person",
                                     order: "1× Käsespätzle", total: 18),
                    ParticipantOrder(id: "o5", participant: "Dirk Aslan", detail: "2 Personen · Nussallergie",
                                     order: nil, total: nil),
                    ParticipantOrder(id: "o6", participant: "Peter Lindqvist", detail: "1 Person",
                                     order: "1× Kalbsschnitzel", total: Decimal(string: "26.50")!)
                ],
                kitchenFooter: "19 Gerichte · Allergien: 1× Nuss, 1× Laktose",
                guestFooter: "6 von 18 Fahrzeugen · nach Bestellstatus sortiert",
                openOrders: 7
            )
        }
    }

    // MARK: Import

    static let recentImports = [
        "Berggasthof Lärchenhof · PDF · 04.06.",
        "Hotel Alpenhof · Mailtext · 28.05.",
        "Sporthotel Zugspitze · Foto · 22.05."
    ]

    static let consent = ImportConsent(
        endpoint: "http://127.0.0.1:11434",
        model: "qwen2.5:7b",
        sourceLine: "laerchenhof-karte.pdf · 2 Seiten · lokal ausgelesen",
        payload: """
        Berggasthof Lärchenhof
        Talstraße 8 · 82491 Grainau
        Tischreservierung Freitag 13.06., 19:30 Uhr, Gruppe Sportfahrer Treff
        Vorbestellung bitte bis Donnerstag 18:00 Uhr
        ABENDKARTE
        Rinderfilet mit Rosmarinkartoffeln … 32,00
        Kalbsschnitzel Wiener Art … 26,50
        Käsespätzle (vegetarisch) … 18,00
        Gemüsecurry mit Reis (vegan) … 19,50
        Apfelstrudel … 5,50
        """,
        systemNote: "Auftrag: nur belegte Felder extrahieren, unklare leer lassen. Keine Datenbankdaten oder Zugangsschlüssel werden mitgeschickt."
    )

    static func extraction(for kind: ImportKind) -> ExtractionResult {
        ExtractionResult(
            sourceName: "laerchenhof-karte.pdf · S. 1/2",
            sourceText: """
            Berggasthof Lärchenhof
            Talstraße 8 · 82491 Grainau
            Tel. 08821 44 21 90

            Tischreservierung Freitag 13.06., 19:30 Uhr, Gruppe Sportfahrer Treff
            Vorbestellung bitte bis Donnerstag 18:00 Uhr

            ABENDKARTE
            Rinderfilet mit Rosmarinkartoffeln … 32,00
            Kalbsschnitzel Wiener Art … 26,50
            Käsespätzle (vegetarisch) … 18,00
            Gemüsecurry mit Reis (vegan) … 19,50
            Apfelstrudel … 5,50

            Getränke nach Verzehr, Abrechnung am Tisch.
            """,
            highlights: [
                "Tischreservierung Freitag 13.06., 19:30 Uhr",
                "Vorbestellung bitte bis Donnerstag 18:00 Uhr"
            ],
            banner: "5 Gerichte und 6 Felder erkannt · 2 Felder ungeklärt",
            modelLine: "qwen2.5:7b · 1 840 / 410 Tokens",
            fields: [
                ExtractedField(id: "f1", label: "Titel", value: "Berggasthof Lärchenhof",
                               evidence: "Berggasthof Lärchenhof"),
                ExtractedField(id: "f2", label: "Adresse", value: "Talstraße 8, 82491 Grainau",
                               evidence: "Talstraße 8 · 82491 Grainau"),
                ExtractedField(id: "f3", label: "Beginn", value: "13.06.2026 · 19:30",
                               evidence: "Freitag 13.06., 19:30 Uhr", mono: true),
                ExtractedField(id: "f4", label: "Bestellfrist", value: "12.06.2026 · 18:00",
                               evidence: "bis Donnerstag 18:00 Uhr", mono: true),
                ExtractedField(id: "f5", label: "Reservierte Personen", value: nil, evidence: nil),
                ExtractedField(id: "f6", label: "Reservierungsstatus", value: nil, evidence: nil,
                               unresolvedHint: "ungeklärt — bitte wählen")
            ],
            dishes: [
                ExtractedDish(id: "d1", name: "Rinderfilet mit Rosmarinkartoffeln", price: 32,
                              evidence: "Rinderfilet mit Rosmarinkartoffeln … 32,00"),
                ExtractedDish(id: "d2", name: "Kalbsschnitzel Wiener Art", price: Decimal(string: "26.50")!,
                              evidence: "Kalbsschnitzel Wiener Art … 26,50"),
                ExtractedDish(id: "d3", name: "Käsespätzle", price: 18,
                              evidence: "Käsespätzle (vegetarisch) … 18,00", isVegetarian: true),
                ExtractedDish(id: "d4", name: "Gemüsecurry mit Reis", price: Decimal(string: "19.50")!,
                              evidence: "Gemüsecurry mit Reis (vegan) … 19,50",
                              isVegetarian: true, isVegan: true),
                ExtractedDish(id: "d5", name: "Apfelstrudel", price: Decimal(string: "5.50")!,
                              evidence: nil,
                              warning: "Allergene ungeklärt — Nuss? im Original nicht angegeben")
            ]
        )
    }

    static func emptyExtraction(for kind: ImportKind) -> ExtractionResult {
        ExtractionResult(
            sourceName: "manuell erfasst",
            sourceText: "",
            highlights: [],
            banner: "Leerer Entwurf — Felder selbst ausfüllen",
            modelLine: "ohne KI",
            fields: [
                ExtractedField(id: "f1", label: "Titel", value: nil, evidence: nil),
                ExtractedField(id: "f2", label: "Adresse", value: nil, evidence: nil),
                ExtractedField(id: "f3", label: "Beginn", value: nil, evidence: nil, mono: true),
                ExtractedField(id: "f4", label: "Bestellfrist", value: nil, evidence: nil, mono: true)
            ],
            dishes: []
        )
    }
}
