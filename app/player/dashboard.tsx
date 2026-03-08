import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BASE,
  CANCHAS,
  CIUDADES,
  GKS,
  MEDIOS_PAGO,
  TIPOS_PARTIDO,
} from "../../components/constants";
import { useAppStore } from "../../store/appStore";

const TABS = [
  { key: "explore", label: "Explorar", emoji: "🔍" },
  { key: "create", label: "Solicitar", emoji: "➕" },
  { key: "svcs", label: "Mis Solicitudes", emoji: "📋" },
];

export default function PlayerDashboard() {
  const router = useRouter();
  const {
    currentUser,
    services,
    addService,
    updateService,
    updateOffer,
    logout,
  } = useAppStore();
  const [tab, setTab] = useState("explore");
  const [filterCity, setFilterCity] = useState("");
  const [filterCityOpen, setFilterCityOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [canchaOpen, setCanchaOpen] = useState(false);
  const [tipoOpen, setTipoOpen] = useState(false);
  const [pagoOpen, setPagoOpen] = useState(false);

  const [form, setForm] = useState({
    ciudad: "",
    cancha: "",
    tipoPartido: "",
    horas: 1,
    medioPago: "",
    fecha: "",
    hora: "",
    nota: "",
  });
  const up = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const mySvcs = services.filter((s) => s.playerId === currentUser?.id);
  const pendingOffers = mySvcs.reduce(
    (a, s) =>
      a +
      (s.ofertas || []).filter(
        (o) => o.status === "pending" || o.status === "countered",
      ).length,
    0,
  );

  const submitService = () => {
    if (
      !form.ciudad ||
      !form.cancha ||
      !form.tipoPartido ||
      !form.medioPago ||
      !form.fecha ||
      !form.hora
    ) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }
    addService({
      id: Date.now(),
      ...form,
      playerId: currentUser!.id,
      playerName: currentUser!.nombre,
      status: "pending",
      total: form.horas * BASE,
      ofertas: [],
      createdAt: new Date().toISOString(),
    } as any);
    Alert.alert("¡Listo!", "Solicitud publicada.");
    setForm({
      ciudad: "",
      cancha: "",
      tipoPartido: "",
      horas: 1,
      medioPago: "",
      fecha: "",
      hora: "",
      nota: "",
    });
    setTab("svcs");
  };

  const acceptOffer = (svcId: number, offerId: number) => {
    const svc = services.find((s) => s.id === svcId);
    const off = svc?.ofertas?.find((o) => o.id === offerId);
    if (!svc || !off) return;
    const total = (off.counterAmount || off.amount) * svc.horas;
    updateService(svcId, {
      status: "confirmed",
      acceptedOffer: offerId,
      confirmedGkName: off.gkName,
      confirmedGkId: off.gkId,
      total,
    });
    updateOffer(svcId, offerId, { status: "accepted" });
    Alert.alert("✅", `¡${off.gkName} confirmado!`);
  };

  const rejectOffer = (svcId: number, offerId: number) =>
    updateOffer(svcId, offerId, { status: "rejected" });

  const handleLogout = () => {
    logout();
    router.replace("/" as any);
  };

  const statusColor: Record<string, string> = {
    pending: "#ffa500",
    confirmed: "#00aaff",
    in_progress: "#00ff87",
    completed: "#888",
    cancelled: "#ff4757",
  };
  const statusLabel: Record<string, string> = {
    pending: "Publicado",
    confirmed: "Confirmado",
    in_progress: "En progreso",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🧤</Text>
          </View>
          <Text style={styles.logoText}>
            Keep<Text style={styles.green}>ers</Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>⚽ Jugador</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text
              style={[styles.tabText, tab === t.key && styles.tabTextActive]}
            >
              {t.emoji} {t.label}
              {t.key === "svcs" && pendingOffers > 0
                ? ` (${pendingOffers})`
                : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* ── EXPLORAR ── */}
        {tab === "explore" && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Porteros disponibles</Text>
              <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => setFilterCityOpen(!filterCityOpen)}
              >
                <Text style={styles.filterBtnText}>
                  {filterCity || "Todas las ciudades"} ▾
                </Text>
              </TouchableOpacity>
            </View>
            {filterCityOpen && (
              <View style={styles.dropdown}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setFilterCity("");
                    setFilterCityOpen(false);
                  }}
                >
                  <Text style={styles.dropdownText}>Todas las ciudades</Text>
                </TouchableOpacity>
                {CIUDADES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFilterCity(c);
                      setFilterCityOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        filterCity === c && styles.dropdownActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {GKS.filter((gk) => !filterCity || gk.ciudad === filterCity).map(
              (gk) => (
                <View key={gk.id} style={styles.card}>
                  <View style={styles.gkRow}>
                    <View style={styles.gkAvatar}>
                      <Text style={styles.gkAvatarText}>{gk.foto}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gkName}>{gk.nombre}</Text>
                      <Text style={styles.gkCity}>📍 {gk.ciudad}</Text>
                    </View>
                    <View
                      style={[
                        styles.availBadge,
                        {
                          backgroundColor: gk.disponible
                            ? "rgba(0,255,135,.1)"
                            : "rgba(255,71,87,.1)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.availText,
                          { color: gk.disponible ? "#00ff87" : "#ff4757" },
                        ]}
                      >
                        {gk.disponible ? "Disponible" : "Ocupado"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.gkDesc}>{gk.descripcion}</Text>
                  <View style={styles.gkFooter}>
                    <Text style={styles.gkRating}>
                      ⭐ {gk.rating} ({gk.reviews})
                    </Text>
                    <Text style={styles.gkPrice}>
                      ${gk.tarifa.toLocaleString()}
                      <Text style={styles.gkPriceSub}>/hr</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={() => setTab("create")}
                  >
                    <Text style={styles.btnPrimaryText}>Solicitar portero</Text>
                  </TouchableOpacity>
                </View>
              ),
            )}
          </View>
        )}

        {/* ── CREAR SOLICITUD ── */}
        {tab === "create" && (
          <View>
            <Text style={styles.sectionTitle}>Nueva solicitud</Text>
            <Text style={styles.sectionSub}>
              Los porteros verán tu solicitud y podrán hacer ofertas
            </Text>

            <Text style={styles.label}>CIUDAD</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setCityOpen(!cityOpen)}
            >
              <Text
                style={
                  form.ciudad ? styles.selectVal : styles.selectPlaceholder
                }
              >
                {form.ciudad || "Selecciona ciudad"}
              </Text>
              <Text style={styles.selectArrow}>▾</Text>
            </TouchableOpacity>
            {cityOpen && (
              <View style={styles.dropdown}>
                {CIUDADES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={styles.dropdownItem}
                    onPress={() => {
                      up("ciudad", c);
                      up("cancha", "");
                      setCityOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        form.ciudad === c && styles.dropdownActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>CANCHA</Text>
            <TouchableOpacity
              style={[styles.selectBtn, !form.ciudad && { opacity: 0.4 }]}
              onPress={() => form.ciudad && setCanchaOpen(!canchaOpen)}
            >
              <Text
                style={
                  form.cancha ? styles.selectVal : styles.selectPlaceholder
                }
              >
                {form.cancha || "Selecciona cancha"}
              </Text>
              <Text style={styles.selectArrow}>▾</Text>
            </TouchableOpacity>
            {canchaOpen && (
              <View style={styles.dropdown}>
                {(CANCHAS[form.ciudad] || []).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={styles.dropdownItem}
                    onPress={() => {
                      up("cancha", c);
                      setCanchaOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        form.cancha === c && styles.dropdownActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>TIPO DE PARTIDO</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setTipoOpen(!tipoOpen)}
            >
              <Text
                style={
                  form.tipoPartido ? styles.selectVal : styles.selectPlaceholder
                }
              >
                {form.tipoPartido || "Selecciona formato"}
              </Text>
              <Text style={styles.selectArrow}>▾</Text>
            </TouchableOpacity>
            {tipoOpen && (
              <View style={styles.dropdown}>
                {TIPOS_PARTIDO.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.dropdownItem}
                    onPress={() => {
                      up("tipoPartido", t);
                      setTipoOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        form.tipoPartido === t && styles.dropdownActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>DURACIÓN</Text>
            <View style={styles.horasRow}>
              {[1, 2, 3, 4, 5].map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.horaBtn,
                    form.horas === h && styles.horaBtnActive,
                  ]}
                  onPress={() => up("horas", h)}
                >
                  <Text
                    style={[
                      styles.horaBtnText,
                      form.horas === h && styles.horaBtnTextActive,
                    ]}
                  >
                    {h}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>MEDIO DE PAGO</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setPagoOpen(!pagoOpen)}
            >
              <Text
                style={
                  form.medioPago ? styles.selectVal : styles.selectPlaceholder
                }
              >
                {form.medioPago || "Selecciona medio"}
              </Text>
              <Text style={styles.selectArrow}>▾</Text>
            </TouchableOpacity>
            {pagoOpen && (
              <View style={styles.dropdown}>
                {MEDIOS_PAGO.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={styles.dropdownItem}
                    onPress={() => {
                      up("medioPago", m);
                      setPagoOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        form.medioPago === m && styles.dropdownActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>FECHA</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#444"
              value={form.fecha}
              onChangeText={(v) => up("fecha", v)}
            />

            <Text style={styles.label}>HORA DE INICIO</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM (ej. 15:00)"
              placeholderTextColor="#444"
              value={form.hora}
              onChangeText={(v) => up("hora", v)}
            />

            <Text style={styles.label}>NOTA (OPCIONAL)</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              multiline
              placeholder="Ej. Partido amistoso, traer guantes..."
              placeholderTextColor="#444"
              value={form.nota}
              onChangeText={(v) => up("nota", v)}
            />

            {form.ciudad && (
              <View style={styles.estimado}>
                <Text style={styles.estimadoLabel}>
                  {form.horas}h · {form.tipoPartido || "–"} · {form.ciudad}
                </Text>
                <Text style={styles.estimadoTotal}>
                  ${(form.horas * BASE).toLocaleString()}
                </Text>
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
            <Text style={styles.sectionTitle}>
              Mis solicitudes ({mySvcs.length})
            </Text>
            {mySvcs.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyText}>Sin solicitudes aún</Text>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => setTab("create")}
                >
                  <Text style={styles.btnPrimaryText}>Crear solicitud</Text>
                </TouchableOpacity>
              </View>
            )}
            {mySvcs.map((svc) => {
              const activeOffers = (svc.ofertas || []).filter(
                (o) => o.status === "pending" || o.status === "countered",
              );
              const confOff = svc.ofertas?.find(
                (o) => o.id === svc.acceptedOffer,
              );
              return (
                <View key={svc.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.svcTitle}>
                      {svc.tipoPartido} · {svc.ciudad}
                    </Text>
                    <Text
                      style={[
                        styles.statusBadge,
                        { color: statusColor[svc.status] },
                      ]}
                    >
                      {statusLabel[svc.status]}
                    </Text>
                  </View>
                  <Text style={styles.svcSub}>
                    {svc.cancha} · {svc.fecha} {svc.hora} · {svc.horas}h
                  </Text>
                  <Text style={styles.svcTotal}>
                    ${svc.total.toLocaleString()}
                  </Text>

                  {/* Ofertas */}
                  {activeOffers.length > 0 && svc.status === "pending" && (
                    <View style={styles.offersBox}>
                      <Text style={styles.offersTitle}>
                        {activeOffers.length} oferta
                        {activeOffers.length > 1 ? "s" : ""} recibida
                        {activeOffers.length > 1 ? "s" : ""}
                      </Text>
                      {svc.ofertas.map((off) => {
                        if (off.status === "rejected") return null;
                        const isCounter = off.status === "countered";
                        const amount = isCounter
                          ? off.counterAmount!
                          : off.amount;
                        return (
                          <View
                            key={off.id}
                            style={[
                              styles.offerCard,
                              isCounter && styles.offerCardCounter,
                            ]}
                          >
                            <View style={styles.rowBetween}>
                              <Text style={styles.offerGkName}>
                                {off.gkName}
                              </Text>
                              <Text
                                style={[
                                  styles.offerAmount,
                                  { color: isCounter ? "#00aaff" : "#00ff87" },
                                ]}
                              >
                                ${amount.toLocaleString()}/hr
                              </Text>
                            </View>
                            {isCounter && (
                              <Text style={styles.counterLabel}>
                                Contraoferta · {off.counterHoras}h = $
                                {(
                                  amount * (off.counterHoras || 1)
                                ).toLocaleString()}
                              </Text>
                            )}
                            {(off.mensaje || off.counterMsg) && (
                              <Text style={styles.offerMsg}>
                                "{off.mensaje || off.counterMsg}"
                              </Text>
                            )}
                            {(off.status === "pending" ||
                              off.status === "countered") && (
                              <View style={styles.offerBtns}>
                                <TouchableOpacity
                                  style={styles.btnAccept}
                                  onPress={() => acceptOffer(svc.id, off.id)}
                                >
                                  <Text style={styles.btnAcceptText}>
                                    ✓ Aceptar
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.btnReject}
                                  onPress={() => rejectOffer(svc.id, off.id)}
                                >
                                  <Text style={styles.btnRejectText}>
                                    ✕ Rechazar
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Confirmado / en progreso */}
                  {(svc.status === "confirmed" ||
                    svc.status === "in_progress") &&
                    confOff && (
                      <View style={styles.confirmedBox}>
                        <Text style={styles.confirmedText}>
                          {svc.status === "in_progress"
                            ? "🟢 En progreso · "
                            : "✓ Confirmado · "}
                          {confOff.gkName}
                        </Text>
                        <TouchableOpacity
                          style={styles.btnChat}
                          onPress={() =>
                            router.push(`/chat?serviceId=${svc.id}` as any)
                          }
                        >
                          <Text style={styles.btnChatText}>💬 Abrir chat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.btnMap}
                          onPress={() =>
                            router.push(`/map?serviceId=${svc.id}` as any)
                          }
                        >
                          <Text style={styles.btnMapText}>
                            📍 Ver mapa en vivo
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                  {/* Completado */}
                  {svc.status === "completed" && (
                    <View style={styles.completedBox}>
                      <Text style={styles.completedText}>
                        ✓ Servicio completado
                      </Text>
                      {svc.gkRatingGiven ? (
                        <Text style={styles.ratingGiven}>
                          Tu calificación: {"⭐".repeat(svc.gkRatingGiven)}
                        </Text>
                      ) : (
                        <TouchableOpacity
                          style={styles.btnRate}
                          onPress={() =>
                            Alert.alert(
                              "Calificación",
                              "Funcionalidad próximamente",
                            )
                          }
                        >
                          <Text style={styles.btnRateText}>
                            ⭐ Calificar portero
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Cancelar */}
                  {svc.status === "pending" && (
                    <TouchableOpacity
                      style={styles.btnCancel}
                      onPress={() =>
                        updateService(svc.id, { status: "cancelled" })
                      }
                    >
                      <Text style={styles.btnCancelText}>
                        Cancelar solicitud
                      </Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoIcon: { backgroundColor: "#00ff87", borderRadius: 6, padding: 6 },
  logoEmoji: { fontSize: 16 },
  logoText: { fontSize: 20, fontWeight: "800", color: "#f0ede8" },
  green: { color: "#00ff87" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  roleBadge: {
    backgroundColor: "rgba(0,170,255,.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleBadgeText: { color: "#00aaff", fontSize: 10, fontWeight: "700" },
  logoutText: { color: "#555", fontSize: 12 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#00ff87" },
  tabText: { color: "#555", fontSize: 10, fontWeight: "700" },
  tabTextActive: { color: "#00ff87" },
  body: { flex: 1 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f0ede8",
    marginBottom: 4,
  },
  sectionSub: { fontSize: 12, color: "#555", marginBottom: 16 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  filterBtn: {
    backgroundColor: "#16161f",
    borderWidth: 1,
    borderColor: "#2a2a35",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterBtnText: { color: "#888", fontSize: 11 },
  card: {
    backgroundColor: "#13131c",
    borderWidth: 1,
    borderColor: "#1e1e2a",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  gkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  gkAvatar: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#00ff87",
    alignItems: "center",
    justifyContent: "center",
  },
  gkAvatarText: { fontWeight: "800", fontSize: 12, color: "#0a0a0f" },
  gkName: { fontWeight: "700", fontSize: 14, color: "#f0ede8" },
  gkCity: { fontSize: 11, color: "#555", marginTop: 2 },
  availBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  availText: { fontSize: 9, fontWeight: "700" },
  gkDesc: { fontSize: 11, color: "#666", lineHeight: 18, marginBottom: 10 },
  gkFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  gkRating: { fontSize: 12, color: "#888" },
  gkPrice: { fontSize: 16, fontWeight: "800", color: "#00ff87" },
  gkPriceSub: { fontSize: 10, color: "#555", fontWeight: "400" },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#777",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    color: "#f0ede8",
    padding: 12,
    borderRadius: 4,
    fontSize: 14,
  },
  selectBtn: {
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    borderRadius: 4,
    padding: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectVal: { color: "#f0ede8", fontSize: 14 },
  selectPlaceholder: { color: "#444", fontSize: 14 },
  selectArrow: { color: "#555", fontSize: 16 },
  dropdown: {
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#00ff87",
    borderRadius: 4,
    marginTop: 4,
  },
  dropdownItem: {
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  dropdownText: { color: "#f0ede8", fontSize: 14 },
  dropdownActive: { color: "#00ff87", fontWeight: "700" },
  horasRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  horaBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    alignItems: "center",
  },
  horaBtnActive: {
    borderColor: "#00ff87",
    backgroundColor: "rgba(0,255,135,.08)",
  },
  horaBtnText: { color: "#555", fontWeight: "700" },
  horaBtnTextActive: { color: "#00ff87" },
  estimado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,255,135,.05)",
    borderWidth: 1,
    borderColor: "rgba(0,255,135,.2)",
    borderRadius: 6,
    padding: 13,
    marginTop: 16,
    marginBottom: 4,
  },
  estimadoLabel: { fontSize: 12, color: "#777" },
  estimadoTotal: { fontSize: 20, fontWeight: "800", color: "#00ff87" },
  btnPrimary: {
    backgroundColor: "#00ff87",
    paddingVertical: 13,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 14,
  },
  btnPrimaryText: { color: "#0a0a0f", fontWeight: "700", fontSize: 14 },
  svcTitle: { fontSize: 14, fontWeight: "700", color: "#f0ede8" },
  svcSub: { fontSize: 11, color: "#555", marginTop: 3 },
  svcTotal: { fontSize: 16, fontWeight: "800", color: "#00ff87", marginTop: 6 },
  statusBadge: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  offersBox: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1a1a24",
    paddingTop: 10,
  },
  offersTitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  offerCard: {
    backgroundColor: "#0f0f18",
    borderWidth: 1,
    borderColor: "#2a2a35",
    borderRadius: 6,
    padding: 11,
    marginBottom: 8,
  },
  offerCardCounter: { borderColor: "rgba(0,170,255,.4)" },
  offerGkName: { fontWeight: "700", fontSize: 13, color: "#f0ede8" },
  offerAmount: { fontWeight: "800", fontSize: 15 },
  counterLabel: { fontSize: 11, color: "#00aaff", marginTop: 4 },
  offerMsg: { fontSize: 11, color: "#666", fontStyle: "italic", marginTop: 5 },
  offerBtns: { flexDirection: "row", gap: 8, marginTop: 10 },
  btnAccept: {
    flex: 1,
    backgroundColor: "#00ff87",
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: "center",
  },
  btnAcceptText: { color: "#0a0a0f", fontWeight: "700", fontSize: 12 },
  btnReject: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#ff4757",
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: "center",
  },
  btnRejectText: { color: "#ff4757", fontWeight: "600", fontSize: 12 },
  confirmedBox: {
    marginTop: 10,
    backgroundColor: "rgba(0,170,255,.06)",
    borderWidth: 1,
    borderColor: "rgba(0,170,255,.25)",
    borderRadius: 6,
    padding: 10,
  },
  confirmedText: {
    color: "#00aaff",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 8,
  },
  btnChat: {
    borderWidth: 1.5,
    borderColor: "#00aaff",
    borderRadius: 4,
    padding: 9,
    alignItems: "center",
  },
  btnChatText: { color: "#00aaff", fontWeight: "700", fontSize: 12 },
  completedBox: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1a1a24",
    paddingTop: 10,
  },
  completedText: { color: "#888", fontSize: 12 },
  ratingGiven: { color: "#ffa500", fontSize: 12, marginTop: 4 },
  btnRate: {
    backgroundColor: "rgba(255,165,0,.1)",
    borderWidth: 1,
    borderColor: "rgba(255,165,0,.3)",
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
    alignItems: "center",
  },
  btnRateText: { color: "#ffa500", fontWeight: "700", fontSize: 12 },
  btnCancel: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#ff4757",
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  btnCancelText: { color: "#ff4757", fontSize: 12, fontWeight: "600" },
  btnMap: {
    borderWidth: 1.5,
    borderColor: "#00ff87",
    borderRadius: 4,
    padding: 9,
    alignItems: "center",
    marginTop: 8,
  },
  btnMapText: { color: "#00ff87", fontWeight: "700", fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 50 },
  emptyEmoji: { fontSize: 42, marginBottom: 10 },
  emptyText: { color: "#444", fontSize: 14, marginBottom: 16 },
});
