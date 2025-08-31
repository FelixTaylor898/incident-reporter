// Felix Taylor
// 08/29/2025

import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Alert, Pressable, Modal,
  TextInput } from "react-native";
import { Picker } from "@react-native-picker/picker";
import IncidentCard from "./components/IncidentCard";
import { Incident, Status } from "./types";

// base url for the backend and the incidents endpoint
const BACKEND_BASE_URL = "http://10.0.0.232:8000";
const INCIDENTS_ENDPOINT = "/api/incidents/";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f6f7f9" },
  card: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    width: "100%",
    alignSelf: "center",
  },
  title: { fontSize: 24, textAlign: "center", color: "#212529" },
  subtitle: { textAlign: "center", marginTop: 4, color: "#6c757d" },

  filterRow: { paddingHorizontal: 16, paddingVertical: 5, marginBottom: 0 },
  filterLabel: { marginBottom: 3, fontWeight: "600", color: "#212529" },
  filterPickerContainer: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  pagerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#0d6efd",
  },
  btnDisabled: { backgroundColor: "#9ec5fe" },
  btnText: { color: "white", fontWeight: "600" },

  // floating button that opens the new incident form
  // this sits above other content in the bottom right
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d6efd",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 28 },

  // modal styles for the add incident form
  // backdrop dims the screen behind the form
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#212529",
  },
  fieldLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fieldLabel: {
    fontWeight: "600",
    marginBottom: 6,
    color: "#212529",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  inputSpacer: { height: 12 },
  modalPickerContainer: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
  helper: { marginTop: 6, color: "#6c757d", fontSize: 12 },
});

// helper to build the list url with page and optional status filter
function buildListUrl(page: number, status?: "" | Status) {
  const params = new URLSearchParams();
  params.set("page_size", "10");
  params.set("page", String(page)); // current page number
  if (status) params.set("status", status);
  return `${BACKEND_BASE_URL}${INCIDENTS_ENDPOINT}?${params.toString()}`;
}

// the api can return a paginated object or a plain array
// we type both shapes so we can handle either without guessing
type PagePayload =
  | { results: Incident[]; count: number; next: string | null; previous: string | null }
  | Incident[];

// fetch one page from the api and normalize the shape
// always returns the same keys so the screen does not care about api shape
async function fetchPage(url: string): Promise<{
  items: Incident[];
  count: number | null;
  next: string | null;
  prev: string | null;
}> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const json: PagePayload = await res.json();

  // handle non-paginated array
  // treat the full array as the current page
  if (Array.isArray(json)) {
    return { items: json, count: json.length, next: null, prev: null };
  }
  // handle paginated response
  // pass through server values so buttons know if next/prev exist
  return {
    items: json.results,
    count: json.count,
    next: json.next,
    prev: json.previous,
  };
}

export default function Index() {
  // list state and pagination state
  // incidents holds the current page of rows shown on screen
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | Status>("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState<number | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);

  // modal form state for adding a new incident
  // keeps inputs controlled so we can validate and reset
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStatus, setNewStatus] = useState<Status>("open");

  // reset the add form to defaults
  // called when closing the modal after a save or cancel
  const resetAddForm = () => {
    setNewTitle("");
    setNewLocation("");
    setNewStatus("open");
  };

  // fetch a page and update local state
  // wraps loading and state updates in one place
  async function loadPage(pageNum: number, status: "" | Status) {
    try {
      const url = buildListUrl(pageNum, status);
      const { items, count, next, prev } = await fetchPage(url);
      setIncidents(items);
      setCount(count);
      setNextUrl(next);
      setPrevUrl(prev);
      setPage(pageNum);
    } catch (e: any) {
      // shows a simple message if the request fails
      Alert.alert("Load Error", e?.message ?? "Failed to load incidents.");
    }
  }

  // initial load and reload when the filter changes
  // always jump back to page 1 when the filter changes so results are clear
  useEffect(() => {
    loadPage(1, statusFilter);
  }, [statusFilter]);

  // change status open to in progress to resolved
  // updates the ui first so it feels fast, then tries the server
  async function cycleStatus(item: Incident) {
    const id = item.id;
    const current = item.status;
    if (current === "resolved") return; // no need to update

    const next: Status = current === "open" ? "in_progress" : "resolved";
    // update ui first
    setIncidents(prev => prev.map(x => (x.id === id ? { ...x, status: next } : x)));

    try {
      const url = `${BACKEND_BASE_URL}${INCIDENTS_ENDPOINT}${id}/`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error(`Update failed (${response.status})`);
      const updated = await response.json().catch(() => null);
      // if server returns the updated object merge it in
      // keeps any server fields as the source of truth
      if (updated) setIncidents(prev => prev.map(x => (x.id === id ? { ...x, ...updated } : x)));
    } catch (e: any) {
      // if the request failed put the old status back
      // this keeps the list correct if the server rejects the change
      setIncidents(prev => prev.map(x => (x.id === id ? { ...x, status: current } : x)));
      Alert.alert("Update Error", e?.message ?? "Failed to update status.");
    }
  }

  // go to the previous page if available
  // guard avoids extra calls when there is no previous page
  const hasPrev = !!prevUrl && page > 1;
  const onPrev = () => {
    if (hasPrev) loadPage(Math.max(1, page - 1), statusFilter);
  };

  // go to the next page if available
  // guard avoids extra calls when there is no next page
  const hasNext = !!nextUrl;
  const onNext = () => {
    if (hasNext) loadPage(page + 1, statusFilter);
  };

  // simple validation flags for required fields
  // used to disable the create button and show a message
  const titleError = !newTitle.trim();
  const locationError = !newLocation.trim();
  const createDisabled = titleError || locationError;

  // create a new incident through the api
  // after a successful post, we reload page 1 so counts and list are fresh
  const submitNewIncident = async () => {
    if (createDisabled) {
      Alert.alert("Validation", "Title and Location are required.");
      return;
    }
    try {
      const res = await fetch(`${BACKEND_BASE_URL}${INCIDENTS_ENDPOINT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          location: newLocation.trim(),
          status: newStatus || "open",
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Create failed (${res.status}) ${msg}`);
      }

      // read the created object in case we want to use it
      const created: Incident = await res.json();
      // reload the first page to include the new record and correct counts
      await loadPage(1, statusFilter);

      // close modal and clear form
      setShowAdd(false);
      resetAddForm();
    } catch (e: any) {
      Alert.alert("Create Error", e?.message ?? "Failed to create incident.");
    }
  };

  // delete an incident by id
  // remove from the list right away, then try the server
  // if the server fails, we put the item back and tell the user
  const deleteIncident = async (item: Incident) => {
    // remove immediately, revert if it fails
    setIncidents(prev => prev.filter(x => x.id !== item.id));
    try {
      const url = `${BACKEND_BASE_URL}${INCIDENTS_ENDPOINT}${item.id}/`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    } catch (e: any) {
      // revert on failure
      // adds the item back and sorts by id to keep a stable order
      setIncidents(prev => [...prev, item].sort((a, b) => (a.id as any) - (b.id as any))); // put incident back into array
      Alert.alert("Delete Error", e?.message ?? "Failed to delete incident.");
    }
  };

  return (
    <View style={styles.screen}>
      {/* header with title and basic count info */}
      {/* shows current page and how many items we see vs total */}
      <View style={styles.card}>
        <Text style={styles.title}>Incident Reports</Text>
        <Text style={styles.subtitle}>
          Page {page} — Showing {incidents.length}
          {typeof count === "number" ? ` of ${count}` : ""} incidents.
        </Text>
      </View>

      {/* filter by status */}
      {/* changing this reloads page 1 with the selected status */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Filter by status</Text>
        <View style={styles.filterPickerContainer}>
          <Picker selectedValue={statusFilter} onValueChange={setStatusFilter}>
            <Picker.Item label="All" value="" />
            <Picker.Item label="Open" value="open" />
            <Picker.Item label="In Progress" value="in_progress" />
            <Picker.Item label="Resolved" value="resolved" />
          </Picker>
        </View>
      </View>

      {/* pagination controls */}
      {/* buttons are disabled when there is no page to go to */}
      <View style={styles.pagerRow}>
        <Pressable
          onPress={onPrev}
          disabled={!hasPrev}
          style={[styles.btn, !hasPrev && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>Prev</Text>
        </Pressable>

        <Pressable
          onPress={onNext}
          disabled={!hasNext}
          style={[styles.btn, !hasNext && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>Next</Text>
        </Pressable>
      </View>

      {/* list of incidents */}
      {/* flatlist only renders what is on screen, which keeps it smooth */}
      <FlatList // used to efficiently render and scroll through the list of incidents while only mounting the items visible on screen
        data={incidents}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <IncidentCard incident={item} onCycle={cycleStatus} onDelete={deleteIncident} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View
            style={{
              marginBottom: 10,
              padding: 12,
              width: "90%",
              alignSelf: "center",
              backgroundColor: "#fff",
              borderColor: "black",
              borderWidth: 0.5,
              borderRadius: 6,
            }}
          >
            <Text>No incidents found.</Text>
          </View>
        }
      />

      {/* floating add button */}
      {/* opens the modal where you can create a new incident */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add incident"
        onPress={() => setShowAdd(true)}
        style={styles.fab}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
      {/* modal with the add incident form */}
      {/* transparent + backdrop gives a dimmed background */}
      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
          <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>New Incident</Text>
                {/* required title field */}
                {/* title is needed to save */}
                <View className="fieldLabelRow">
                  <Text style={styles.fieldLabel}>Title</Text>
                </View>
                <TextInput
                  value={newTitle}
                  onChangeText={(t) => {
                    setNewTitle(t);
                  }}
                  placeholder="Short description"
                  style={[styles.input]}
                  autoFocus
                />
                <View style={styles.inputSpacer} />
                {/* required location field */}
                {/* location is needed to save */}
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Location</Text>
                </View>
                <TextInput
                  value={newLocation}
                  onChangeText={(t) => {
                    setNewLocation(t);
                  }}
                  placeholder="e.g. 300 North Main Street"
                  style={[styles.input]}
                />
                <View style={styles.inputSpacer} />
                {/* optional status picker defaults to open */}
                {/* you can change this before creating an incident */}
                <Text style={styles.fieldLabel}>Status</Text>
                <View style={styles.modalPickerContainer}>
                  <Picker selectedValue={newStatus} onValueChange={(v) => setNewStatus(v as Status)}>
                    <Picker.Item label="Open" value="open" />
                    <Picker.Item label="In Progress" value="in_progress" />
                    <Picker.Item label="Resolved" value="resolved" />
                  </Picker>
                </View>
                {/* action buttons */}
                <View style={styles.modalButtonsRow}>
                  <Pressable
                    style={styles.btn}
                    onPress={() => {
                      setShowAdd(false);
                      resetAddForm();
                    }}
                  >
                    <Text style={styles.btnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, createDisabled && styles.btnDisabled]}
                    onPress={submitNewIncident}
                    disabled={createDisabled}
                  >
                    <Text style={styles.btnText}>{"Create"}</Text>
                  </Pressable>
                </View>
              </View>
          </View>
      </Modal>
    </View>
  );
}