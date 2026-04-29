import { useEffect, useState } from "react";
import { updateBookingStatus } from "../services/bookingService";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import {
  Box, Typography, Card, CardContent, Chip, Stack,
  CircularProgress, Avatar, Tabs, Tab, MenuItem,
  Select, FormControl, Tooltip, IconButton, Snackbar, Alert, Pagination,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PhoneIcon from "@mui/icons-material/Phone";
import LogoutIcon from "@mui/icons-material/Logout";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const SERVICE_LABELS = {
  economy_small: "Economy Wash (Small)",    economy_large: "Economy Wash (SUV/Van)",
  classic_small: "Classic Wash (Small)",    classic_large: "Classic Wash (SUV/Van)",
  vip_small: "VIP Deluxe (Small)",          vip_large: "VIP Deluxe (SUV/Van)",
  engine_wash: "Engine Wash",               interior_sanitize: "Interior Sanitization",
  wax_polish: "Wax & Polish",               full_detail_small: "Full Detail (Small)",
  full_detail_large: "Full Detail (SUV/Van)",ppf: "PPF",
  ceramic_coating: "Ceramic Coating",       mobile_basic: "Mobile Wash (Basic)",
  mobile_full: "Mobile Full Detail",
};

// Maria Santos → M**** S*****
const maskName = (name = "") =>
  name.split(" ").map((w) => w[0] + "*".repeat(Math.max(w.length - 1, 1))).join(" ");

// +639393440944 → +6393****0944
const maskPhone = (phone = "") =>
  phone.length > 7 ? phone.slice(0, 5) + "****" + phone.slice(-4) : phone;


const STATUSES     = ["pending", "for_review", "confirmed", "paid", "cancelled"];
const FILTERS      = ["all", "for_review", "pending", "confirmed", "paid", "cancelled"];
const STATUS_COLOR = { pending: "warning", for_review: "secondary", confirmed: "success", cancelled: "error", paid: "info" };

const PAGE_SIZE = 10;

export default function Dashboard() {
  const { logout, business } = useAuth();
  const businessId = business?.id;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [toast, setToast]       = useState("");
  const [page, setPage]         = useState(1);

  const load = () => {
    if (!businessId) { setLoading(false); return; }
    const q = query(
      collection(db, "bookings"),
      where("businessId", "==", businessId),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  };

  useEffect(() => {
    const unsub = load();
    return () => unsub?.();
  }, [businessId]);

  const handleStatusChange = async (bookingId, status) => {
    await updateBookingStatus(bookingId, status);
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status } : b));
    setToast(`Status updated to "${status}"`);
  };

  const filtered = filter === "all"
    ? bookings
    : bookings.filter((b) => b.status === filter);

  const sorted     = filtered;
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    { label: "Total",     value: bookings.length,                                    color: "#2563eb" },
    { label: "Pending",   value: bookings.filter((b) => b.status === "pending").length,   color: "#d97706" },
    { label: "Confirmed", value: bookings.filter((b) => b.status === "confirmed").length, color: "#16a34a" },
    { label: "Paid",      value: bookings.filter((b) => b.status === "paid").length,      color: "#0891b2" },
  ];

  const PLAN_LIMIT = business?.plan === "free Tier" || !business?.plan ? 10 : Infinity;
  const atLimit    = PLAN_LIMIT !== Infinity && bookings.length >= PLAN_LIMIT;
  const nearLimit  = PLAN_LIMIT !== Infinity && bookings.length >= PLAN_LIMIT * 0.8 && !atLimit;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Bookings</Typography>
        <Tooltip title="Logout">
          <IconButton onClick={logout} size="small"><LogoutIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Stack>

      {/* Plan limit banner */}
      {(atLimit || nearLimit) && (
        <Alert
          severity={atLimit ? "error" : "warning"}
          icon={<WarningAmberIcon />}
          sx={{ mb: 3 }}
          action={
            <Chip label="Upgrade Plan" size="small" color={atLimit ? "error" : "warning"}
              onClick={() => {}} sx={{ cursor: "pointer", fontWeight: 600 }} />
          }
        >
          {atLimit
            ? `You've reached the ${PLAN_LIMIT}-booking limit on the Free plan. New bookings are blocked until you upgrade.`
            : `You're at ${bookings.length}/${PLAN_LIMIT} bookings on the Free plan. Upgrade soon to avoid interruptions.`
          }
        </Alert>
      )}

      {/* Stats */}
      <Stack direction={{ xs:"column", sm:"row" }} spacing={2} mb={4}>
        {stats.map(({ label, value, color }) => (
          <Card key={label} sx={{ flex: 1, boxShadow: 1 }}>
            <CardContent>
              <Typography fontSize={13} color="text.secondary" mb={0.5}>{label}</Typography>
              <Typography fontSize={32} fontWeight={700} color={color}>{value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onChange={(_, v) => { setFilter(v); setPage(1); }}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        variant="scrollable"
      >
        {FILTERS.map((f) => (
          <Tab key={f} value={f} label={f.charAt(0).toUpperCase() + f.slice(1)}
            sx={{ fontSize: 13, textTransform: "capitalize", minWidth: 80 }} />
        ))}
      </Tabs>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography fontWeight={600} fontSize={15}>Bookings</Typography>
        <Typography fontSize={13} color="text.secondary">{filtered.length} shown</Typography>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={6} color="text.secondary">
          <Typography fontSize={36}>📋</Typography>
          <Typography mt={1}>No bookings found</Typography>
        </Box>
      ) : (
        <>
          <Stack spacing={1.5}>
            {paginated.map((b) => (
              <Card key={b.id} sx={{ boxShadow: 1, "&:hover": { boxShadow: 3 }, transition: "box-shadow .2s" }}>
                <CardContent sx={{ py: "14px !important" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ width: 38, height: 38, bgcolor: "primary.light", color: "primary.main", fontSize: 15, fontWeight: 700 }}>
                        {b.customerName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={600} fontSize={14}>{maskName(b.customerName)}</Typography>
                        {b.refNumber && (
                          <Typography fontSize={11} color="primary.main" fontWeight={600} letterSpacing={0.5}>#{b.refNumber}</Typography>
                        )}
                        <Stack direction="row" spacing={1.5} mt={0.5} sx={{ flexWrap: "wrap" }}>
                          <Stack direction="row" spacing={0.4} alignItems="center">
                            <CalendarMonthIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                            <Typography fontSize={12} color="text.secondary">{b.date}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.4} alignItems="center">
                            <AccessTimeIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                            <Typography fontSize={12} color="text.secondary">{b.time}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.4} alignItems="center">
                            <PhoneIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                            <Typography fontSize={12} color="text.secondary">{maskPhone(b.phone)}</Typography>
                          </Stack>
                        </Stack>
                        {b.notes && (
                          <Typography fontSize={12} color="text.disabled" mt={0.5}>"{b.notes}"</Typography>
                        )}
                      </Box>
                    </Stack>

                    <Stack alignItems="flex-end" spacing={1}>
                      <Typography fontSize={13} fontWeight={500} color="primary.main">
                        {b.serviceName || b.serviceId}
                      </Typography>
                      {/* Owner can change status manually */}
                      <FormControl size="small">
                        <Select
                          value={b.status}
                          onChange={(e) => handleStatusChange(b.id, e.target.value)}
                          renderValue={(v) => (
                            <Chip label={v} color={STATUS_COLOR[v] || "default"} size="small"
                              sx={{ fontSize: 11, height: 22, textTransform: "capitalize", cursor: "pointer" }} />
                          )}
                          sx={{ "& .MuiOutlinedInput-notchedOutline": { border: "none" }, p: 0 }}
                        >
                          {STATUSES.map((s) => (
                            <MenuItem key={s} value={s} sx={{ fontSize: 13, textTransform: "capitalize" }}>
                              <Chip label={s} color={STATUS_COLOR[s] || "default"} size="small"
                                sx={{ fontSize: 11, height: 20, textTransform: "capitalize" }} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
          {totalPages > 1 && (
            <Stack alignItems="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
              />
              <Typography fontSize={12} color="text.secondary" mt={1}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </Typography>
            </Stack>
          )}
        </>
      )}

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast("")}>
        <Alert severity="success" onClose={() => setToast("")}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
