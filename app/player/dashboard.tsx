import { useState } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAppStore } from "../../store/appStore";
import { CIUDADES, CANCHAS, MEDIOS_PAGO, BASE, GKS } from "../../components/constants";

// Sin "Pichanga"
const TIPOS_PARTIDO = ["Fútbol 5", "Fútbol 7", "Fútbol 8", "Fútbol 11", "Entrenamiento", "Torneo"];

const TABS = [
  { key: "explore", label: "Explorar",       emoji: "🔍" },
  { key: "create",  label: "Solicitar",       emoji: "➕" },
  { key: "svcs",    label: "Mis Solicitudes", emoji: "📋" },
];

// ── Mini calendario ───────────────────────────────────────────────────────────
function CalendarPicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [open,  setOpen]  = useState(false);

  const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const DAYS   = ["D","L","M","M","J","V","S"];

  const firstDay  = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const selectDay = (d: number) => {
    const dd = String(d).padStart(2, "0");
    const mm = String(month + 1).padStart(2, "0");
    onChange(`${year}-${mm}-${dd}`);
    setOpen(false);
  };
  const isToday = (d: number) => {
    const t = new Date();
    return d === t.getDate() && month === t.getMonth() && year === t.getFullYear();
  };
  const isPast = (d: number) => new Date(year, month, d) < new Date(today.toDateString());

  return (
    <>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
        <Text style={value ? styles.selectVal : styles.selectPlaceholder}>
          {value || "Selecciona fecha"}
        </Text>
        <Text style={styles.selectArrow}>📅</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={calS.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={calS.box} onStartShouldSetResponder={() => true}>
            {/* Header mes */}
            <View style={calS.header}>
              <TouchableOpacity onPress={prevMonth}><Text style={calS.navBtn}>◀</Text></TouchableOpacity>
              <Text style={calS.monthLabel}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity onPress={nextMonth}><Text style={calS.navBtn}>▶</Text></TouchableOpacity>
            </View>
            {/* Días de semana */}
            <View style={calS.weekRow}>
              {DAYS.map((d, i) => <Text key={i} style={calS.weekDay}>{d}</Text>)}
            </View>
            {/* Grilla */}
            <View style={calS.grid}>
              {cells.map((d, i) => (
                <TouchableOpacity key={i} style={[
                  calS.cell,
                  !!d && isToday(d)  ? calS.cellToday   : null,
                  !!d && isPast(d)   ? calS.cellPast    : null,
                  !!d && value === `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}` ? calS.cellSelected : null,
                ]} onPress={() => d && !isPast(d) && selectDay(d)} disabled={!d || isPast(d)}>
                  <Text style={[
                    calS.cellText,
                    !!d && isPast(d)  ? calS.cellTextPast  : null,
                    !!d && isToday(d) ? calS.cellTextToday : null,
                  ]}>{d ?? ""}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Selector de hora ──────────────────────────────────────────────────────────
function TimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const hours   = Array.from({ length: 24 }, (_, i) => i);
  const minutes = ["00", "30"];
  const selH = value ? parseInt(value.split(":")[0]) : -1;
  const selM = value ? value.split(":")[1] : "";

  return (
    <>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(!open)}>
        <Text style={value ? styles.selectVal : styles.selectPlaceholder}>
          {value || "Selecciona hora"}
        </Text>
        <Text style={styles.selectArrow}>🕐</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={tpS.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={tpS.box} onStartShouldSetResponder={() => true}>
            <Text style={tpS.title}>Hora de inicio</Text>
            <View style={tpS.cols}>
              <ScrollView style={tpS.col} showsVerticalScrollIndicator={false}>
                {hours.map((h) => {
                  const label = String(h).padStart(2,"0");
                  const active = selH === h;
                  return (
                    <TouchableOpacity key={h} style={[tpS.cell, active && tpS.cellActive]}
                      onPress={() => onChange(`${label}:${selM || "00"}`)}>
                      <Text style={[tpS.cellText, active && tpS.cellTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={tpS.colon}>:</Text>
              <View style={tpS.col}>
                {minutes.map((m) => {
                  const active = selM === m;
                  return (
                    <TouchableOpacity key={m} style={[tpS.cell, active && tpS.cellActive]}
                      onPress={() => {
                        const h = selH >= 0 ? String(selH).padStart(2,"0") : "08";
                        onChange(`${h}:${m}`);
                        setOpen(false);
                      }}>
                      <Text style={[tpS.cellText, active && tpS.cellTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const tpS = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,.7)", justifyContent: "center", alignItems: "center" },
  box:           { backgroundColor: "#13131c", borderRadius: 12, padding: 20, width: 240, borderWidth: 1, borderColor: "#2a2a35" },
  title:         { color: "#f0ede8", fontWeight: "700", fontSize: 15, marginBottom: 14, textAlign: "center" },
  cols:          { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  col:           { maxHeight: 200, width: 70 },
  colon:         { color: "#00ff87", fontSize: 28, fontWeight: "800", marginHorizontal: 8 },
  cell:          { paddingVertical: 10, alignItems: "center", borderRadius: 6, marginBottom: 2 },
  cellActive:    { backgroundColor: "#00ff87" },
  cellText:      { color: "#888", fontSize: 18, fontWeight: "600" },
  cellTextActive:{ color: "#0a0a0f", fontWeight: "800" },
});

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function PlayerDashboard() {
  const router = useRouter();
  const { currentUser, services, addService, updateService, updateOffer, logout } = useAppStore();
  const [tab, setTab] = useState("explore");
  const [filterCity, setFilterCity] = useState("");
  const [filterCityOpen, setFilterCityOpen] = useState(false);
  const [cityOpen,   setCityOpen]   = useState(false);
  const [canchaOpen, setCanchaOpen] = useState(false);
  const [tipoOpen,   setTipoOpen]   = useState(false);
  const [pagoOpen,   setPagoOpen]   = useState(false);

  const [form, setForm] = useState({
    ciudad: "", cancha: "", tipoPartido: "",
    horas: 1, medioPago: "", fecha: "", hora: "", nota: "",
  });
  const up = (k: string, v: any) => {
    setForm((f) => ({ ...f, [k]: v }));
    // Cerrar otros dropdowns al abrir uno
    if (k !== "ciudad")     setCityOpen(false);
    if (k !== "cancha")     setCanchaOpen(false);
    if (k !== "tipoPartido") setTipoOpen(false);
    if (k !== "medioPago")  setPagoOpen(false);
  };

  const mySvcs = services.filter((s) => s.playerId === currentUser?.id);
  const pendingOffers = mySvcs.reduce(
    (a, s) => a + (s.ofertas || []).filter(
      (o) => o.status === "pending" || o.status === "countered"
    ).length, 0
  );

  const submitService = async () => {
    if (!form.ciudad || !form.cancha || !form.tipoPartido || !form.medioPago || !form.fecha || !form.hora) {
      Alert.alert("Error", "Completa todos los campos"); return;
    }
    // Validar que la fecha y hora sean al menos 1 hora en el futuro
    const serviceDateTime = new Date(`${form.fecha}T${form.hora}:00`);
    const minDateTime = new Date(Date.now() + 60 * 60 * 1000); // ahora + 1 hora
    if (isNaN(serviceDateTime.getTime())) {
      Alert.alert("Error", "Fecha u hora inválida"); return;
    }
    if (serviceDateTime < minDateTime) {
      Alert.alert(
        "Fecha inválida",
        "El servicio debe solicitarse con al menos 1 hora de anticipación. Selecciona una fecha y hora futura."
      ); return;
    }
    try {
      await addService({
        playerId:          currentUser!.id,
        playerName:        currentUser!.nombre,
        ciudad:            form.ciudad,
        cancha:            form.cancha,
        tipoPartido:       form.tipoPartido,
        horas:             form.horas,
        medioPago:         form.medioPago,
        fecha:             form.fecha,
        hora:              form.hora,
        nota:              form.nota,
        status:            "pending",
        total:             form.horas * BASE,
        ofertas:           [],
        acceptedOffer:     null,
        confirmedGkId:     null,
        confirmedGkName:   null,
        gkRatingGiven:     null,
        playerRatingGiven: null,
      } as any);
      Alert.alert("¡Listo!", "Solicitud publicada.");
      setForm({ ciudad: "", cancha: "", tipoPartido: "", horas: 1, medioPago: "", fecha: "", hora: "", nota: "" });
      setTab("svcs");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo publicar");
    }
  };

  const acceptOffer = async (svcId: string, offerId: string) => {
    const svc = services.find((s) => s.id === svcId);
    const off = svc?.ofertas?.find((o) => o.id === offerId);
    if (!svc || !off) return;
    Alert.alert(
      "Confirmar portero",
      `¿Confirmar a ${off.gkName} por $${(off.counterAmount || off.amount).toLocaleString()}/hr?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar", onPress: async () => {
            try {
              const total = off.counterAmount || off.amount;
              await updateService(svcId, {
                status: "confirmed", acceptedOffer: offerId,
                confirmedGkName: off.gkName, confirmedGkId: off.gkId, total,
              });
              await updateOffer(svcId, offerId, { status: "accepted" });
              Alert.alert("✅", `¡${off.gkName} confirmado!`);
            } catch (e: any) {
              Alert.alert("Error", e?.message || "No se pudo confirmar");
            }
          }
        },
      ]
    );
  };

  const rejectOffer = async (svcId: string, offerId: string) => {
    try {
      await updateOffer(svcId, offerId, { status: "rejected" });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo rechazar");
    }
  };

  const cancelService = (svcId: string) => {
    Alert.alert(
      "Cancelar solicitud",
      "¿Seguro que quieres cancelar esta solicitud?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, cancelar", style: "destructive",
          onPress: async () => {
            try {
              await updateService(svcId, { status: "cancelled" });
            } catch (e: any) {
              Alert.alert("Error", e?.message || "No se pudo cancelar");
            }
          }
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir", style: "destructive",
        onPress: () => { logout(); router.replace("/" as any); }
      },
    ]);
  };

  const statusColor: Record<string, string> = {
    pending: "#ffa500", confirmed: "#00aaff",
    in_progress: "#00ff87", completed: "#888", cancelled: "#ff4757",
  };
  const statusLabel: Record<string, string> = {
    pending: "Publicado", confirmed: "Confirmado",
    in_progress: "En progreso", completed: "Completado", cancelled: "Cancelado",
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}><Text style={styles.logoEmoji}>🧤</Text></View>
          <Text style={styles.logoText}>Keep<Text style={styles.green}>ers</Text></Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>⚽ Jugador</Text></View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.emoji} {t.label}
              {t.key === "svcs" && pendingOffers > 0 ? ` (${pendingOffers})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">

        {/* ── EXPLORAR ── */}
        {tab === "explore" && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Porteros disponibles</Text>
              <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterCityOpen(!filterCityOpen)}>
                <Text style={styles.filterBtnText}>{filterCity || "Todas"} ▾</Text>
              </TouchableOpacity>
            </View>
            {filterCityOpen && (
              <View style={[styles.dropdown, { marginBottom: 10 }]}>
                <TouchableOpacity style={styles.dropdownItem}
                  onPress={() => { setFilterCity(""); setFilterCityOpen(false); }}>
                  <Text style={styles.dropdownText}>Todas las ciudades</Text>
                </TouchableOpacity>
                {CIUDADES.map((c) => (
                  <TouchableOpacity key={c} style={styles.dropdownItem}
                    onPress={() => { setFilterCity(c); setFilterCityOpen(false); }}>
                    <Text style={[styles.dropdownText, filterCity === c && styles.dropdownActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {GKS.filter((gk) => !filterCity || gk.ciudad === filterCity).map((gk) => (
              <View key={gk.id} style={styles.card}>
                <View style={styles.gkRow}>
                  <View style={styles.gkAvatar}><Text style={styles.gkAvatarText}>{gk.foto}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gkName}>{gk.nombre}</Text>
                    <Text style={styles.gkCity}>📍 {gk.ciudad}</Text>
                  </View>
                  <View style={[styles.availBadge, { backgroundColor: gk.disponible ? "rgba(0,255,135,.1)" : "rgba(255,71,87,.1)" }]}>
                    <Text style={[styles.availText, { color: gk.disponible ? "#00ff87" : "#ff4757" }]}>
                      {gk.disponible ? "Disponible" : "Ocupado"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.gkDesc}>{gk.descripcion}</Text>
                <View style={styles.gkFooter}>
                  <Text style={styles.gkRating}>⭐ {gk.rating} ({gk.reviews})</Text>
                  <Text style={styles.gkPrice}>${gk.tarifa.toLocaleString()}<Text style={styles.gkPriceSub}>/hr</Text></Text>
                </View>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => setTab("create")}>
                  <Text style={styles.btnPrimaryText}>Solicitar portero</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── CREAR SOLICITUD ── */}
        {tab === "create" && (
          <View>
            <Text style={styles.sectionTitle}>Nueva solicitud</Text>
            <Text style={styles.sectionSub}>Los porteros verán tu solicitud y podrán hacer ofertas</Text>

            <Text style={styles.label}>CIUDAD</Text>
            <TouchableOpacity style={styles.selectBtn}
              onPress={() => { setCityOpen(!cityOpen); setCanchaOpen(false); setTipoOpen(false); setPagoOpen(false); }}>
              <Text style={form.ciudad ? styles.selectVal : styles.selectPlaceholder}>{form.ciudad || "Selecciona ciudad"}</Text>
              <Text style={styles.selectArrow}>{cityOpen ? "▴" : "▾"}</Text>
            </TouchableOpacity>
            {cityOpen && (
              <View style={styles.dropdown}>
                {CIUDADES.map((c) => (
                  <TouchableOpacity key={c} style={styles.dropdownItem}
                    onPress={() => { up("ciudad", c); up("cancha", ""); setCityOpen(false); }}>
                    <Text style={[styles.dropdownText, form.ciudad === c && styles.dropdownActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>CANCHA</Text>
            <TouchableOpacity style={[styles.selectBtn, !form.ciudad && { opacity: 0.4 }]}
              onPress={() => { if (!form.ciudad) return; setCanchaOpen(!canchaOpen); setCityOpen(false); setTipoOpen(false); setPagoOpen(false); }}>
              <Text style={form.cancha ? styles.selectVal : styles.selectPlaceholder}>{form.cancha || "Selecciona cancha"}</Text>
              <Text style={styles.selectArrow}>{canchaOpen ? "▴" : "▾"}</Text>
            </TouchableOpacity>
            {canchaOpen && (
              <View style={styles.dropdown}>
                {(CANCHAS[form.ciudad] || []).map((c) => (
                  <TouchableOpacity key={c} style={styles.dropdownItem}
                    onPress={() => { up("cancha", c); setCanchaOpen(false); }}>
                    <Text style={[styles.dropdownText, form.cancha === c && styles.dropdownActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>TIPO DE PARTIDO</Text>
            <TouchableOpacity style={styles.selectBtn}
              onPress={() => { setTipoOpen(!tipoOpen); setCityOpen(false); setCanchaOpen(false); setPagoOpen(false); }}>
              <Text style={form.tipoPartido ? styles.selectVal : styles.selectPlaceholder}>{form.tipoPartido || "Selecciona formato"}</Text>
              <Text style={styles.selectArrow}>{tipoOpen ? "▴" : "▾"}</Text>
            </TouchableOpacity>
            {tipoOpen && (
              <View style={styles.dropdown}>
                {TIPOS_PARTIDO.map((t) => (
                  <TouchableOpacity key={t} style={styles.dropdownItem}
                    onPress={() => { up("tipoPartido", t); setTipoOpen(false); }}>
                    <Text style={[styles.dropdownText, form.tipoPartido === t && styles.dropdownActive]}>
                      {form.tipoPartido === t ? "✓ " : ""}{t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>DURACIÓN</Text>
            <View style={styles.horasRow}>
              {[1, 2, 3, 4, 5].map((h) => (
                <TouchableOpacity key={h}
                  style={[styles.horaBtn, form.horas === h && styles.horaBtnActive]}
                  onPress={() => up("horas", h)}>
                  <Text style={[styles.horaBtnText, form.horas === h && styles.horaBtnTextActive]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>MEDIO DE PAGO</Text>
            <TouchableOpacity style={styles.selectBtn}
              onPress={() => { setPagoOpen(!pagoOpen); setCityOpen(false); setCanchaOpen(false); setTipoOpen(false); }}>
              <Text style={form.medioPago ? styles.selectVal : styles.selectPlaceholder}>{form.medioPago || "Selecciona medio"}</Text>
              <Text style={styles.selectArrow}>{pagoOpen ? "▴" : "▾"}</Text>
            </TouchableOpacity>
            {pagoOpen && (
              <View style={styles.dropdown}>
                {MEDIOS_PAGO.map((m) => (
                  <TouchableOpacity key={m} style={styles.dropdownItem}
                    onPress={() => { up("medioPago", m); setPagoOpen(false); }}>
                    <Text style={[styles.dropdownText, form.medioPago === m && styles.dropdownActive]}>
                      {form.medioPago === m ? "✓ " : ""}{m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>FECHA</Text>
            <CalendarPicker value={form.fecha} onChange={(d) => up("fecha", d)} />

            <Text style={styles.label}>HORA DE INICIO</Text>
            <TimePicker value={form.hora} onChange={(t) => up("hora", t)} />

            <Text style={styles.label}>NOTA (OPCIONAL)</Text>
            <TextInput style={[styles.input, { height: 70 }]} multiline
              placeholder="Ej. Partido amistoso, traer guantes..." placeholderTextColor="#444"
              value={form.nota} onChangeText={(v) => up("nota", v)} />

            {form.ciudad && (
              <View style={styles.estimado}>
                <Text style={styles.estimadoLabel}>{form.horas}h · {form.tipoPartido || "–"} · {form.ciudad}</Text>
                <Text style={styles.estimadoTotal}>${(form.horas * BASE).toLocaleString()}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.btnPrimary} onPress={submitService}>
              <Text style={styles.btnPrimaryText}>Publicar solicitud</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── MIS SOLICITUDES ── */}
        {tab === "svcs" && (
          <View>
            <Text style={styles.sectionTitle}>Mis solicitudes</Text>
            {mySvcs.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyText}>No tienes solicitudes aún</Text>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => setTab("create")}>
                  <Text style={styles.btnPrimaryText}>Crear solicitud</Text>
                </TouchableOpacity>
              </View>
            )}
            {mySvcs.map((svc) => {
              const confOff = (svc.ofertas || []).find((o) => o.id === svc.acceptedOffer);
              const pendOff = (svc.ofertas || []).filter(
                (o) => o.status === "pending" || o.status === "countered"
              );
              return (
                <View key={svc.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.svcTitle}>{svc.tipoPartido} · {svc.ciudad}</Text>
                    <Text style={[styles.statusBadge, { color: statusColor[svc.status] ?? "#888" }]}>
                      ● {statusLabel[svc.status] ?? svc.status}
                    </Text>
                  </View>
                  <Text style={styles.svcSub}>📅 {svc.fecha} · {svc.hora} · {svc.horas}h</Text>
                  <Text style={styles.svcSub}>📍 {svc.cancha}</Text>
                  <Text style={styles.svcTotal}>${(svc.total || 0).toLocaleString()}</Text>

                  {/* Ofertas pendientes */}
                  {pendOff.length > 0 && (
                    <View style={styles.offersBox}>
                      <Text style={styles.offersTitle}>{pendOff.length} oferta(s) recibida(s)</Text>
                      {pendOff.map((off) => (
                        <View key={off.id} style={[styles.offerCard, off.status === "countered" && styles.offerCardCounter]}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.offerGkName}>🧤 {off.gkName}</Text>
                            <Text style={[styles.offerAmount, { color: off.status === "countered" ? "#00aaff" : "#00ff87" }]}>
                              ${(off.counterAmount || off.amount).toLocaleString()} COP
                            </Text>
                          </View>
                          {off.status === "countered" && (
                            <Text style={styles.counterLabel}>
                              🔄 Contraoferta · {off.counterHoras || svc.horas}h · ${(off.counterAmount || 0).toLocaleString()} COP total
                            </Text>
                          )}
                          {(off.mensaje || off.counterMsg) && (
                            <Text style={styles.offerMsg}>"{off.counterMsg || off.mensaje}"</Text>
                          )}
                          <View style={styles.offerBtns}>
                            <TouchableOpacity style={styles.btnAccept} onPress={() => acceptOffer(svc.id, off.id)}>
                              <Text style={styles.btnAcceptText}>✓ Aceptar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnReject} onPress={() => rejectOffer(svc.id, off.id)}>
                              <Text style={styles.btnRejectText}>✕ Rechazar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Confirmado/En progreso */}
                  {(svc.status === "confirmed" || svc.status === "in_progress") && (
                    <View style={styles.confirmedBox}>
                      <Text style={styles.confirmedText}>
                        {svc.status === "in_progress" ? "🟢 En progreso · " : "✓ Confirmado · "}
                        {svc.confirmedGkName}
                      </Text>
                      <TouchableOpacity style={styles.btnChat}
                        onPress={() => router.push(`/chat?serviceId=${svc.id}` as any)}>
                        <Text style={styles.btnChatText}>💬 Abrir chat</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnMap}
                        onPress={() => router.push(`/map?serviceId=${svc.id}` as any)}>
                        <Text style={styles.btnMapText}>📍 Ver mapa en vivo</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Completado */}
                  {svc.status === "completed" && (
                    <View style={styles.completedBox}>
                      <Text style={styles.completedText}>✓ Servicio completado</Text>
                      {svc.gkRatingGiven ? (
                        <Text style={styles.ratingGiven}>Tu calificación: {"⭐".repeat(svc.gkRatingGiven)}</Text>
                      ) : (
                        <TouchableOpacity style={styles.btnRate}
                          onPress={() => router.push(`/rating?serviceId=${svc.id}` as any)}>
                          <Text style={styles.btnRateText}>⭐ Calificar portero</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Cancelar */}
                  {svc.status === "pending" && (
                    <TouchableOpacity style={styles.btnCancel} onPress={() => cancelService(svc.id)}>
                      <Text style={styles.btnCancelText}>Cancelar solicitud</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const calS = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,.7)", justifyContent: "center", alignItems: "center" },
  box:           { backgroundColor: "#13131c", borderRadius: 12, padding: 16, width: 300, borderWidth: 1, borderColor: "#2a2a35" },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  navBtn:        { color: "#00ff87", fontSize: 16, paddingHorizontal: 8 },
  monthLabel:    { color: "#f0ede8", fontWeight: "700", fontSize: 14 },
  weekRow:       { flexDirection: "row", marginBottom: 6 },
  weekDay:       { flex: 1, textAlign: "center", color: "#555", fontSize: 11, fontWeight: "700" },
  grid:          { flexDirection: "row", flexWrap: "wrap" },
  cell:          { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 4 },
  cellToday:     { borderWidth: 1, borderColor: "#00ff87" },
  cellPast:      { opacity: 0.3 },
  cellSelected:  { backgroundColor: "#00ff87" },
  cellText:      { color: "#f0ede8", fontSize: 12 },
  cellTextPast:  { color: "#444" },
  cellTextToday: { color: "#00ff87" },
});

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: "#0a0a0f" },
  header:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#1e1e2a" },
  logoRow:           { flexDirection: "row", alignItems: "center", gap: 8 },
  logoIcon:          { backgroundColor: "#00ff87", borderRadius: 6, padding: 6 },
  logoEmoji:         { fontSize: 16 },
  logoText:          { fontSize: 20, fontWeight: "800", color: "#f0ede8" },
  green:             { color: "#00ff87" },
  headerRight:       { flexDirection: "row", alignItems: "center", gap: 10 },
  roleBadge:         { backgroundColor: "rgba(0,170,255,.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  roleBadgeText:     { color: "#00aaff", fontSize: 10, fontWeight: "700" },
  logoutBtn:         { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#2a2a35", borderRadius: 4 },
  logoutText:        { color: "#888", fontSize: 12 },
  tabs:              { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1e1e2a" },
  tab:               { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive:         { borderBottomColor: "#00ff87" },
  tabText:           { color: "#555", fontSize: 10, fontWeight: "700" },
  tabTextActive:     { color: "#00ff87" },
  body:              { flex: 1 },
  sectionTitle:      { fontSize: 18, fontWeight: "800", color: "#f0ede8", marginBottom: 4 },
  sectionSub:        { fontSize: 12, color: "#555", marginBottom: 16 },
  rowBetween:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  filterBtn:         { backgroundColor: "#16161f", borderWidth: 1, borderColor: "#2a2a35", borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6 },
  filterBtnText:     { color: "#888", fontSize: 11 },
  card:              { backgroundColor: "#13131c", borderWidth: 1, borderColor: "#1e1e2a", borderRadius: 8, padding: 16, marginBottom: 12 },
  gkRow:             { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  gkAvatar:          { width: 40, height: 40, borderRadius: 6, backgroundColor: "#00ff87", alignItems: "center", justifyContent: "center" },
  gkAvatarText:      { fontWeight: "800", fontSize: 12, color: "#0a0a0f" },
  gkName:            { fontWeight: "700", fontSize: 14, color: "#f0ede8" },
  gkCity:            { fontSize: 11, color: "#555", marginTop: 2 },
  availBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  availText:         { fontSize: 9, fontWeight: "700" },
  gkDesc:            { fontSize: 11, color: "#666", lineHeight: 18, marginBottom: 10 },
  gkFooter:          { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  gkRating:          { fontSize: 12, color: "#888" },
  gkPrice:           { fontSize: 16, fontWeight: "800", color: "#00ff87" },
  gkPriceSub:        { fontSize: 10, color: "#555", fontWeight: "400" },
  label:             { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: "#777", marginBottom: 6, marginTop: 14 },
  input:             { backgroundColor: "#16161f", borderWidth: 1.5, borderColor: "#2a2a35", color: "#f0ede8", padding: 12, borderRadius: 4, fontSize: 14 },
  selectBtn:         { backgroundColor: "#16161f", borderWidth: 1.5, borderColor: "#2a2a35", borderRadius: 4, padding: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectVal:         { color: "#f0ede8", fontSize: 14 },
  selectPlaceholder: { color: "#444", fontSize: 14 },
  selectArrow:       { color: "#555", fontSize: 16 },
  dropdown:          { backgroundColor: "#16161f", borderWidth: 1.5, borderColor: "#00ff87", borderRadius: 4, marginTop: 4, maxHeight: 200 },
  dropdownItem:      { padding: 13, borderBottomWidth: 1, borderBottomColor: "#1e1e2a" },
  dropdownText:      { color: "#f0ede8", fontSize: 14 },
  dropdownActive:    { color: "#00ff87", fontWeight: "700" },
  horasRow:          { flexDirection: "row", gap: 8, marginTop: 2 },
  horaBtn:           { flex: 1, paddingVertical: 10, borderRadius: 4, borderWidth: 1.5, borderColor: "#2a2a35", alignItems: "center" },
  horaBtnActive:     { borderColor: "#00ff87", backgroundColor: "rgba(0,255,135,.08)" },
  horaBtnText:       { color: "#555", fontWeight: "700" },
  horaBtnTextActive: { color: "#00ff87" },
  estimado:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(0,255,135,.05)", borderWidth: 1, borderColor: "rgba(0,255,135,.2)", borderRadius: 6, padding: 13, marginTop: 16 },
  estimadoLabel:     { fontSize: 12, color: "#777" },
  estimadoTotal:     { fontSize: 20, fontWeight: "800", color: "#00ff87" },
  btnPrimary:        { backgroundColor: "#00ff87", paddingVertical: 13, borderRadius: 4, alignItems: "center", marginTop: 14 },
  btnPrimaryText:    { color: "#0a0a0f", fontWeight: "700", fontSize: 14 },
  svcTitle:          { fontSize: 14, fontWeight: "700", color: "#f0ede8" },
  svcSub:            { fontSize: 11, color: "#555", marginTop: 3 },
  svcTotal:          { fontSize: 16, fontWeight: "800", color: "#00ff87", marginTop: 6 },
  statusBadge:       { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  offersBox:         { marginTop: 12, borderTopWidth: 1, borderTopColor: "#1a1a24", paddingTop: 10 },
  offersTitle:       { fontSize: 9, fontWeight: "700", letterSpacing: 1.5, color: "#666", marginBottom: 8 },
  offerCard:         { backgroundColor: "#0f0f18", borderWidth: 1, borderColor: "#2a2a35", borderRadius: 6, padding: 11, marginBottom: 8 },
  offerCardCounter:  { borderColor: "rgba(0,170,255,.4)" },
  offerGkName:       { fontWeight: "700", fontSize: 13, color: "#f0ede8" },
  offerAmount:       { fontWeight: "800", fontSize: 15 },
  counterLabel:      { fontSize: 11, color: "#00aaff", marginTop: 4 },
  offerMsg:          { fontSize: 11, color: "#666", fontStyle: "italic", marginTop: 5 },
  offerBtns:         { flexDirection: "row", gap: 8, marginTop: 10 },
  btnAccept:         { flex: 1, backgroundColor: "#00ff87", paddingVertical: 8, borderRadius: 4, alignItems: "center" },
  btnAcceptText:     { color: "#0a0a0f", fontWeight: "700", fontSize: 12 },
  btnReject:         { flex: 1, borderWidth: 1.5, borderColor: "#ff4757", paddingVertical: 8, borderRadius: 4, alignItems: "center" },
  btnRejectText:     { color: "#ff4757", fontWeight: "600", fontSize: 12 },
  confirmedBox:      { marginTop: 10, backgroundColor: "rgba(0,170,255,.06)", borderWidth: 1, borderColor: "rgba(0,170,255,.25)", borderRadius: 6, padding: 10, gap: 8 },
  confirmedText:     { color: "#00aaff", fontWeight: "700", fontSize: 12 },
  btnChat:           { borderWidth: 1.5, borderColor: "#00aaff", borderRadius: 4, padding: 9, alignItems: "center" },
  btnChatText:       { color: "#00aaff", fontWeight: "700", fontSize: 12 },
  btnMap:            { borderWidth: 1.5, borderColor: "#00ff87", borderRadius: 4, padding: 9, alignItems: "center" },
  btnMapText:        { color: "#00ff87", fontWeight: "700", fontSize: 12 },
  completedBox:      { marginTop: 10, borderTopWidth: 1, borderTopColor: "#1a1a24", paddingTop: 10 },
  completedText:     { color: "#888", fontSize: 12 },
  ratingGiven:       { color: "#ffa500", fontSize: 12, marginTop: 4 },
  btnRate:           { backgroundColor: "rgba(255,165,0,.1)", borderWidth: 1, borderColor: "rgba(255,165,0,.3)", borderRadius: 4, padding: 10, marginTop: 8, alignItems: "center" },
  btnRateText:       { color: "#ffa500", fontWeight: "700", fontSize: 12 },
  btnCancel:         { marginTop: 10, borderWidth: 1.5, borderColor: "#ff4757", borderRadius: 4, padding: 10, alignItems: "center" },
  btnCancelText:     { color: "#ff4757", fontSize: 12, fontWeight: "600" },
  empty:             { alignItems: "center", paddingVertical: 50 },
  emptyEmoji:        { fontSize: 42, marginBottom: 10 },
  emptyText:         { color: "#444", fontSize: 14, marginBottom: 16 },
});
