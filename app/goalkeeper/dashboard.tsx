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
import { BASE } from "../../components/constants";
import { useAppStore } from "../../store/appStore";

const TABS = [
  { key: "available", label: "Solicitudes", emoji: "🔍" },
  { key: "myoffers", label: "Mis Ofertas", emoji: "🔔" },
  { key: "confirmed", label: "Mis Servicios", emoji: "🚩" },
];

export default function GoalkeeperDashboard() {
  const router = useRouter();
  const {
    currentUser,
    services,
    updateService,
    addOffer,
    updateOffer,
    logout,
  } = useAppStore();
  const [tab, setTab] = useState("available");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, any>>({});

  const gf = (id: string) =>
    forms[id] || {
      msg: "",
      tarifa: String(currentUser?.tarifa || BASE),
      horas: 2,
      mode: "offer",
    };
  const sf = (id: string, patch: any) =>
    setForms((f) => ({ ...f, [id]: { ...gf(id), ...patch } }));

  const available = services.filter(
    (s) =>
      s.status === "pending" &&
      (() => {
        const myOffer = (s.ofertas || []).find(
          (o) => o.gkId === currentUser?.id,
        );
        // Mostrar si no ha ofertado, o si su oferta fue rechazada (puede volver a ofertar)
        return !myOffer || myOffer.status === "rejected";
      })(),
  );
  const myOffers = services.filter((s) =>
    (s.ofertas || []).find((o) => o.gkId === currentUser?.id),
  );
  const confirmed = services.filter(
    (s) =>
      ["confirmed", "in_progress", "completed"].includes(s.status) &&
      (s.ofertas || []).find(
        (o) => o.id === s.acceptedOffer && o.gkId === currentUser?.id,
      ),
  );
  const activeSvcs = confirmed.filter(
    (s) => s.status === "confirmed" || s.status === "in_progress",
  ).length;

  const sendOffer = (svcId: string) => {
    const f = gf(svcId);
    const isC = f.mode === "counter";
    const svc = services.find((s) => s.id === svcId);
    const prev = svc?.ofertas?.find((o) => o.gkId === currentUser?.id);

    const offerData: any = {
      id: prev?.id || String(Date.now()),
      gkId: currentUser!.id,
      gkName: currentUser!.nombre,
      gkRating: currentUser!.rating || 4.7,
      mensaje: isC ? "" : f.msg,
      amount: parseInt(f.tarifa) || BASE,
      status: isC ? "countered" : "pending",
      counterAmount: isC ? parseInt(f.tarifa) : null,
      counterHoras: isC ? parseInt(f.horas) : null,
      counterMsg: isC ? f.msg : null,
    };

    if (prev && prev.status === "rejected") {
      // Reusar misma oferta sobreescribiendo campos — jugador ya la rechazó, nueva oportunidad
      updateOffer(svcId, prev.id, offerData);
    } else {
      addOffer(svcId, offerData);
    }
    Alert.alert("✅", isC ? "¡Contraoferta enviada!" : "¡Oferta enviada!");
    setExpanded(null);
    setForms((f) => ({ ...f, [svcId]: undefined as any }));
  };

  const startService = (svcId: string) => {
    Alert.alert("Iniciar servicio", "¿Confirmas que ya estás en la cancha?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Iniciar",
        onPress: () => {
          updateService(svcId, {
            status: "in_progress",
            startedAt: new Date().toISOString(),
          } as any);
          Alert.alert("🟢", "¡Servicio iniciado! Buen partido.");
        },
      },
    ]);
  };

  const endService = (svcId: string) => {
    Alert.alert("Finalizar servicio", "¿Confirmas que el partido terminó?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Finalizar",
        onPress: () => {
          updateService(svcId, {
            status: "completed",
            completedAt: new Date().toISOString(),
          } as any);
          Alert.alert("🏁", "¡Servicio completado! Gracias por usar Keepers.");
        },
      },
    ]);
  };

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
            <Text style={styles.roleBadgeText}>🧤 Portero</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {(
          [
            ["Solicitudes", available.length, "#00ff87"],
            ["Mis ofertas", myOffers.length, "#ffa500"],
            ["Activos", activeSvcs, "#00aaff"],
          ] as const
        ).map(([l, v, c]) => (
          <View key={l} style={styles.statCard}>
            <Text style={[styles.statVal, { color: c }]}>{v}</Text>
            <Text style={styles.statLabel}>{l}</Text>
          </View>
        ))}
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
              {t.key === "confirmed" && activeSvcs > 0
                ? ` (${activeSvcs})`
                : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* ── SOLICITUDES ── */}
        {tab === "available" && (
          <View>
            <Text style={styles.sectionSub}>
              Envía oferta directa o contraoferta
            </Text>
            {available.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyText}>
                  Sin solicitudes disponibles
                </Text>
              </View>
            )}
            {available.map((svc) => {
              const f = gf(svc.id);
              const exp = expanded === svc.id;
              const isC = f.mode === "counter";
              return (
                <View key={svc.id} style={styles.card}>
                  <TouchableOpacity
                    onPress={() => setExpanded(exp ? null : svc.id)}
                  >
                    <View style={styles.rowBetween}>
                      <View>
                        <Text style={styles.svcTitle}>{svc.tipoPartido}</Text>
                        <Text style={styles.svcSub}>
                          📍 {svc.ciudad} · {svc.cancha}
                        </Text>
                        <Text style={styles.svcSub}>
                          🕐 {svc.fecha} {svc.hora} · {svc.horas}h
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.svcTotal}>
                          ${svc.total.toLocaleString()}
                        </Text>
                        <Text style={styles.svcPago}>{svc.medioPago}</Text>
                        <Text style={styles.expandHint}>
                          {exp ? "▲ cerrar" : "▼ responder"}
                        </Text>
                      </View>
                    </View>
                    {svc.nota ? (
                      <Text style={styles.svcNota}>"{svc.nota}"</Text>
                    ) : null}
                  </TouchableOpacity>

                  {exp && (
                    <View style={styles.offerForm}>
                      <View style={styles.modeRow}>
                        {(
                          [
                            ["offer", "Oferta directa", "#00ff87"],
                            ["counter", "Contraoferta", "#00aaff"],
                          ] as const
                        ).map(([mode, label, color]) => (
                          <TouchableOpacity
                            key={mode}
                            style={[
                              styles.modeBtn,
                              f.mode === mode && {
                                borderColor: color,
                                backgroundColor: `${color}12`,
                              },
                            ]}
                            onPress={() => sf(svc.id, { mode })}
                          >
                            <Text
                              style={[
                                styles.modeBtnText,
                                f.mode === mode && { color },
                              ]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.label}>
                        VALOR TOTAL DEL SERVICIO (COP)
                      </Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholderTextColor="#444"
                        placeholder={String(BASE)}
                        value={f.tarifa}
                        onChangeText={(v) => sf(svc.id, { tarifa: v })}
                      />
                      {isC && (
                        <>
                          <Text style={styles.label}>HORAS PROPUESTAS</Text>
                          <View style={styles.horasRow}>
                            {[1, 2, 3, 4, 5].map((h) => (
                              <TouchableOpacity
                                key={h}
                                style={[
                                  styles.horaBtn,
                                  f.horas === h && styles.horaBtnActive,
                                ]}
                                onPress={() => sf(svc.id, { horas: h })}
                              >
                                <Text
                                  style={[
                                    styles.horaBtnText,
                                    f.horas === h && styles.horaBtnTextActive,
                                  ]}
                                >
                                  {h}h
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}
                      <Text style={styles.label}>
                        {isC ? "JUSTIFICACIÓN" : "MENSAJE (OPCIONAL)"}
                      </Text>
                      <TextInput
                        style={[styles.input, { height: 70 }]}
                        multiline
                        placeholderTextColor="#444"
                        placeholder={
                          isC
                            ? "Ej. Para horario nocturno cobro un poco más..."
                            : "Ej. Puntual, experiencia en este formato..."
                        }
                        value={f.msg}
                        onChangeText={(v) => sf(svc.id, { msg: v })}
                      />
                      <Text style={styles.totalPreview}>
                        Tu oferta total:{" "}
                        <Text
                          style={{
                            color: isC ? "#00aaff" : "#00ff87",
                            fontWeight: "800",
                          }}
                        >
                          ${(parseInt(f.tarifa) || BASE).toLocaleString()} COP
                        </Text>
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.btnPrimary,
                          isC && { backgroundColor: "#00aaff" },
                        ]}
                        onPress={() => sendOffer(svc.id)}
                      >
                        <Text style={styles.btnPrimaryText}>
                          {isC ? "Enviar contraoferta" : "Enviar oferta"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ── MIS OFERTAS ── */}
        {tab === "myoffers" && (
          <View>
            <Text style={styles.sectionSub}>
              Estado de tus ofertas enviadas
            </Text>
            {myOffers.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔔</Text>
                <Text style={styles.emptyText}>Sin ofertas enviadas</Text>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => setTab("available")}
                >
                  <Text style={styles.btnPrimaryText}>Ver solicitudes</Text>
                </TouchableOpacity>
              </View>
            )}
            {myOffers.map((svc) => {
              const my = svc.ofertas.find((o) => o.gkId === currentUser?.id);
              const acc = svc.acceptedOffer === my?.id;
              const isC = my?.status === "countered";
              const stC = acc
                ? "#00ff87"
                : my?.status === "rejected"
                  ? "#ff4757"
                  : isC
                    ? "#00aaff"
                    : "#ffa500";
              const stL = acc
                ? "✓ Aceptado"
                : my?.status === "rejected"
                  ? "Rechazado"
                  : isC
                    ? "Contraoferta"
                    : "⏳ Pendiente";
              return (
                <View key={svc.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <View>
                      <Text style={styles.svcTitle}>
                        {svc.tipoPartido} · {svc.ciudad}
                      </Text>
                      <Text style={styles.svcSub}>
                        {svc.cancha} · {svc.fecha} {svc.hora}
                      </Text>
                    </View>
                    <Text style={[styles.statusTag, { color: stC }]}>
                      {stL}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.svcTotal,
                      { color: isC ? "#00aaff" : "#00ff87" },
                    ]}
                  >
                    $
                    {(my?.counterAmount || my?.amount || BASE).toLocaleString()}{" "}
                    COP
                  </Text>
                  {my?.status === "rejected" && (
                    <TouchableOpacity
                      style={styles.btnReofert}
                      onPress={() => {
                        setTab("available");
                      }}
                    >
                      <Text style={styles.btnReofertText}>
                        🔄 Volver a ofertar
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ── MIS SERVICIOS ── */}
        {tab === "confirmed" && (
          <View>
            <Text style={styles.sectionSub}>
              Gestiona el ciclo de vida de tus servicios
            </Text>
            {confirmed.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🚩</Text>
                <Text style={styles.emptyText}>Sin servicios confirmados</Text>
              </View>
            )}
            {confirmed.map((svc) => {
              const my = svc.ofertas.find((o) => o.gkId === currentUser?.id);
              const total = my?.counterAmount || my?.amount || BASE;
              const canStart = svc.status === "confirmed";
              const canEnd = svc.status === "in_progress";
              const isDone = svc.status === "completed";
              return (
                <View
                  key={svc.id}
                  style={[
                    styles.card,
                    canEnd && { borderColor: "rgba(0,255,135,.4)" },
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.svcTitle}>{svc.tipoPartido}</Text>
                    <Text
                      style={[
                        styles.statusTag,
                        { color: statusColor[svc.status] },
                      ]}
                    >
                      {statusLabel[svc.status]}
                    </Text>
                  </View>
                  <View style={styles.infoGrid}>
                    {(
                      [
                        ["Ciudad", svc.ciudad],
                        ["Cancha", svc.cancha],
                        ["Fecha", svc.fecha],
                        ["Hora", svc.hora],
                        ["Duración", `${svc.horas}h`],
                        ["Jugador", svc.playerName],
                      ] as const
                    ).map(([k, v]) => (
                      <View key={k} style={styles.infoItem}>
                        <Text style={styles.infoKey}>{k}</Text>
                        <Text style={styles.infoVal}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.svcSub}>{svc.medioPago}</Text>
                    <Text style={styles.svcTotal}>
                      ${total.toLocaleString()}
                    </Text>
                  </View>

                  {canStart && (
                    <View style={styles.actionBox}>
                      <Text style={styles.actionHint}>
                        Presiona cuando estés listo en la cancha.
                      </Text>
                      <TouchableOpacity
                        style={styles.btnStart}
                        onPress={() => startService(svc.id)}
                      >
                        <Text style={styles.btnStartText}>
                          ▶ Iniciar servicio
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {canEnd && (
                    <View style={[styles.actionBox, styles.actionBoxRed]}>
                      <View style={styles.inProgressRow}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.inProgressText}>
                          Servicio en curso
                        </Text>
                      </View>
                      <Text style={styles.actionHint}>
                        Presiona al finalizar el partido.
                      </Text>
                      <TouchableOpacity
                        style={styles.btnEnd}
                        onPress={() => endService(svc.id)}
                      >
                        <Text style={styles.btnEndText}>
                          ■ Finalizar servicio
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Botones Chat y Mapa — visibles cuando está confirmado o en progreso */}
                  {(canStart || canEnd) && (
                    <>
                      <TouchableOpacity
                        style={styles.btnChat}
                        onPress={() =>
                          router.push(`/chat?serviceId=${svc.id}` as any)
                        }
                      >
                        <Text style={styles.btnChatText}>
                          💬 Chat con el jugador
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnMap}
                        onPress={() =>
                          router.push(`/map?serviceId=${svc.id}` as any)
                        }
                      >
                        <Text style={styles.btnMapText}>📍 Ver tu ruta</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {isDone && (
                    <View style={styles.completedBox}>
                      <Text style={styles.completedText}>
                        ✓ Servicio completado · ${total.toLocaleString()}
                      </Text>
                      {svc.playerRatingGiven ? (
                        <Text style={styles.ratingGiven}>
                          Tu calificación al jugador:{" "}
                          {"⭐".repeat(svc.playerRatingGiven)}
                        </Text>
                      ) : (
                        <TouchableOpacity
                          style={styles.btnRate}
                          onPress={() =>
                            router.push(`/rating?serviceId=${svc.id}` as any)
                          }
                        >
                          <Text style={styles.btnRateText}>
                            ⭐ Calificar al jugador
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
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
    backgroundColor: "rgba(0,255,135,.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleBadgeText: { color: "#00ff87", fontSize: 10, fontWeight: "700" },
  logoutText: { color: "#555", fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#13131c",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  statVal: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 9, color: "#555", marginTop: 2 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#00ff87" },
  tabText: { color: "#555", fontSize: 9, fontWeight: "700" },
  tabTextActive: { color: "#00ff87" },
  body: { flex: 1 },
  sectionSub: { fontSize: 12, color: "#555", marginBottom: 14 },
  card: {
    backgroundColor: "#13131c",
    borderWidth: 1,
    borderColor: "#1e1e2a",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  svcTitle: { fontSize: 14, fontWeight: "700", color: "#f0ede8" },
  svcSub: { fontSize: 11, color: "#555", marginTop: 2 },
  svcTotal: { fontSize: 16, fontWeight: "800", color: "#00ff87" },
  svcPago: { fontSize: 10, color: "#555" },
  svcNota: { fontSize: 11, color: "#666", fontStyle: "italic", marginTop: 6 },
  expandHint: { fontSize: 9, color: "#444", marginTop: 4 },
  statusTag: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  offerForm: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#1a1a24",
    paddingTop: 14,
  },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  modeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    borderRadius: 4,
    padding: 9,
    alignItems: "center",
  },
  modeBtnText: { color: "#555", fontWeight: "700", fontSize: 11 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#777",
    marginBottom: 6,
    marginTop: 12,
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
  horasRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  horaBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    alignItems: "center",
  },
  horaBtnActive: {
    borderColor: "#00ff87",
    backgroundColor: "rgba(0,255,135,.08)",
  },
  horaBtnText: { color: "#555", fontWeight: "700", fontSize: 12 },
  horaBtnTextActive: { color: "#00ff87" },
  totalPreview: { fontSize: 12, color: "#777", marginTop: 10 },
  btnPrimary: {
    backgroundColor: "#00ff87",
    paddingVertical: 13,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 14,
  },
  btnPrimaryText: { color: "#0a0a0f", fontWeight: "700", fontSize: 14 },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "#0f0f18",
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  infoItem: { width: "45%" },
  infoKey: {
    fontSize: 9,
    color: "#555",
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  infoVal: { fontSize: 12, color: "#f0ede8", marginTop: 2 },
  actionBox: {
    backgroundColor: "rgba(0,255,135,.04)",
    borderWidth: 1,
    borderColor: "rgba(0,255,135,.2)",
    borderRadius: 6,
    padding: 13,
    marginTop: 10,
  },
  actionBoxRed: {
    backgroundColor: "rgba(255,71,87,.04)",
    borderColor: "rgba(255,71,87,.2)",
  },
  actionHint: { fontSize: 11, color: "#666", marginBottom: 10 },
  inProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00ff87",
  },
  inProgressText: { fontSize: 12, color: "#00ff87", fontWeight: "700" },
  btnStart: {
    backgroundColor: "#00ff87",
    paddingVertical: 13,
    borderRadius: 6,
    alignItems: "center",
  },
  btnStartText: { color: "#0a0a0f", fontWeight: "800", fontSize: 14 },
  btnEnd: {
    backgroundColor: "#ff4757",
    paddingVertical: 13,
    borderRadius: 6,
    alignItems: "center",
  },
  btnEndText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  btnChat: {
    borderWidth: 1.5,
    borderColor: "#00aaff",
    borderRadius: 4,
    padding: 9,
    alignItems: "center",
    marginTop: 10,
  },
  btnChatText: { color: "#00aaff", fontWeight: "700", fontSize: 12 },
  btnMap: {
    borderWidth: 1.5,
    borderColor: "#00ff87",
    borderRadius: 4,
    padding: 9,
    alignItems: "center",
    marginTop: 8,
  },
  btnMapText: { color: "#00ff87", fontWeight: "700", fontSize: 12 },
  completedBox: {
    borderTopWidth: 1,
    borderTopColor: "#1a1a24",
    paddingTop: 12,
    marginTop: 8,
  },
  completedText: { fontSize: 12, color: "#888" },
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
  btnReofert: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#00aaff",
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  btnReofertText: { color: "#00aaff", fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 50 },
  emptyEmoji: { fontSize: 42, marginBottom: 10 },
  emptyText: { color: "#444", fontSize: 14, marginBottom: 16 },
});
