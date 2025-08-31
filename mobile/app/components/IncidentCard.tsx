// incident card component that renders one incident row with actions
// this file only deals with display and simple button taps; network work stays in the parent
// Felix Taylor
// 08/29/2025
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Incident, Status } from "./../types";

type Props = {
  incident: Incident;
  onCycle?: (incident: Incident) => void | Promise<void>;
  onDelete?: (incident: Incident) => void | Promise<void>;
};

// map status codes to short labels for the badge at the bottom
const LABELS: Record<Status, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

// local styles for layout, spacing, and button look
const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    padding: 12,
    borderColor: "black",
    borderWidth: 0.5,
    borderRadius: 6,
    width: "80%",
    alignSelf: "center",
    backgroundColor: "#fff",
  },
  // top row shows the title on the left and action buttons on the right
  header: { flexDirection: "row", justifyContent: "space-between", columnGap: 8 },
  title: { fontWeight: "bold", flexShrink: 1 }, // flexShrink avoids long titles pushing buttons off screen
  meta: { marginTop: 4 }, // used for location and created date text under the header

  // primary action
  // used for "cycle status"
  btn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#0d6efd" },
  btnText: { color: "white", fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },

  // secondary destructive action
  // used for "delete"
  btnDanger: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#dc3545" },

  // button row
  // keeps action buttons side by side with a small gap
  actions: { flexDirection: "row", columnGap: 8 },

  // status badge at the bottom of the card
  status: { marginTop: 6, fontWeight: "600", textAlign: "center", paddingVertical: 4, borderRadius: 4, color: "white" },
  statusOpen: { backgroundColor: "#dc3545" },       // red for open
  statusInProgress: { backgroundColor: "#fd7e14" }, // orange for in progress
  statusResolved: { backgroundColor: "#198754" },   // green for resolved
});

// adds style to status
// picks a color based on the current status and always includes base badge styling
const statusStyle = (s: Status | undefined) => {
  if (s === "in_progress") return [styles.status, styles.statusInProgress];
  if (s === "resolved") return [styles.status, styles.statusResolved];
  return [styles.status, styles.statusOpen];
};

// optimizes rendering
// react.memo prevents re-render unless props change, which helps when the list is long
const IncidentCard = React.memo(({ incident, onCycle, onDelete }: Props) => {
  // pick the status, default to open if missing
  const s = incident.status ?? "open";

  // resolved incidents cannot be modified, onCycle needs to be provided
  // this keeps the ui consistent with the server rules (open -> in_progress -> resolved only)
  const canCycle = s !== "resolved" && !!onCycle;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{incident.title}</Text>

        {/* actions */}
        {/* only show cycle if allowed */}
        <View style={styles.actions}>
          {canCycle && (
            <Pressable onPress={() => onCycle?.(incident)} style={styles.btn}>
              <Text style={styles.btnText}>Cycle Status</Text>
            </Pressable>
          )}

          {!!onDelete && (
            <Pressable onPress={() => onDelete(incident)} style={styles.btnDanger}>
              <Text style={styles.btnText}>Delete</Text>
            </Pressable>
          )}
        </View>
      </View>

      {incident.location && <Text style={styles.meta}>{incident.location}</Text>}

      {/* toLocaleString makes the timestamp readable */}
      {incident.created_at && (
        <Text style={styles.meta}>
          {new Date(incident.created_at).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </Text>
      )}

      <Text style={statusStyle(s)}>{LABELS[s]}</Text>
    </View>
  );
});

IncidentCard.displayName = "IncidentCard";
export default IncidentCard;
