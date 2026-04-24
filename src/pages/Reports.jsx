import { useEffect, useState, useMemo } from "react";
import { getBookingsByBusiness } from "../services/bookingService";
import { useAuth } from "../context/AuthContext";
import {
  Box, Typography, Card, CardContent, Stack, ToggleButton,
  ToggleButtonGroup, CircularProgress, Divider, Avatar, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  LinearProgress,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptIcon from "@mui/icons-material/Receipt";
import StarIcon from "@mui/icons-material/Star";

// Maria Santos → M**** S*****
const maskName = (name = "") =>
  name.split(" ").map((w) => w[0] + "*".repeat(Math.max(w.length - 1, 1))).join(" ");

// +639393440944 → +6393****0944
const maskPhone = (phone = "") =>
  phone.length > 7 ? phone.slice(0, 5) + "****" + phone.slice(-4) : phone;

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

const SERVICE_PRICES = {
  economy_small: 150,  economy_large: 200,  classic_small: 250,
  classic_large: 350,  vip_small: 450,      vip_large: 600,
  engine_wash: 350,    interior_sanitize: 500, wax_polish: 600,
  full_detail_small: 1200, full_detail_large: 1500, ppf: 15000,
  ceramic_coating: 8000, mobile_basic: 400, mobile_full: 1500,
};

const STATUS_COLOR = { pending: "warning", confirmed: "primary", paid: "success", cancelled: "error" };

function getPeriodStart(period) {
  const now = new Date();
  if (period === "day")   { now.setHours(0,0,0,0); return now; }
  if (period === "week")  { now.setDate(now.getDate() - 7); return now; }
  if (period === "month") { now.setDate(now.getDate() - 30); return now; }
  return new Date(0);
}

function StatCard({ icon, label, value, sub, color = "primary.main" }) {
  return (
    <Card sx={{ flex: 1, boxShadow: 1 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography fontSize={13} color="text.secondary" mb={0.5}>{label}</Typography>
            <Typography fontSize={28} fontWeight={700} color={color}>{value}</Typography>
            {sub && <Typography fontSize={12} color="text.disabled" mt={0.5}>{sub}</Typography>}
          </Box>
          <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { business } = useAuth();
  const businessId = business?.id;
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [period, setPeriod]           = useState("month");

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    getBookingsByBusiness(businessId)
      .then(setAllBookings)
      .finally(() => setLoading(false));
  }, []);

  const bookings = useMemo(() => {
    const start = getPeriodStart(period);
    return allBookings.filter((b) => {
      const d = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date);
      return d >= start;
    });
  }, [allBookings, period]);

  const paid     = bookings.filter((b) => b.status === "paid");
  const revenue  = paid.reduce((sum, b) => sum + (b.price || SERVICE_PRICES[b.serviceId] || 0), 0);
  const avgValue = paid.length ? Math.round(revenue / paid.length) : 0;

  // Top services
  const serviceCounts = bookings.reduce((acc, b) => {
    acc[b.serviceId] = (acc[b.serviceId] || 0) + 1;
    return acc;
  }, {});
  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxServiceCount = topServices[0]?.[1] || 1;

  // Frequent customers — from ALL bookings (not just period)
  const customerMap = allBookings.reduce((acc, b) => {
    const key = b.phone || b.customerName;
    if (!acc[key]) acc[key] = { name: b.customerName, phone: b.phone, count: 0, lastDate: "", revenue: 0 };
    acc[key].count++;
    acc[key].revenue += (b.price || SERVICE_PRICES[b.serviceId] || 0);
    if (!acc[key].lastDate || b.date > acc[key].lastDate) acc[key].lastDate = b.date;
    return acc;
  }, {});
  const frequentCustomers = Object.values(customerMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Status breakdown
  const statusBreakdown = ["paid","confirmed","pending","cancelled"].map((s) => ({
    status: s,
    count: bookings.filter((b) => b.status === s).length,
  }));

  const periodLabel = { day: "Today", week: "Last 7 Days", month: "Last 30 Days" }[period];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Reports</Typography>
        <ToggleButtonGroup
          value={period} exclusive size="small"
          onChange={(_, v) => v && setPeriod(v)}
        >
          <ToggleButton value="day"   sx={{ fontSize: 12, px: 2 }}>Day</ToggleButton>
          <ToggleButton value="week"  sx={{ fontSize: 12, px: 2 }}>Week</ToggleButton>
          <ToggleButton value="month" sx={{ fontSize: 12, px: 2 }}>Month</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <Stack spacing={3}>
          {/* Summary stats */}
          <Stack direction="row" spacing={2}>
            <StatCard
              icon={<ReceiptIcon />}
              label={`Revenue (${periodLabel})`}
              value={`₱${revenue.toLocaleString()}`}
              sub={`${paid.length} paid bookings`}
              color="#16a34a"
            />
            <StatCard
              icon={<TrendingUpIcon />}
              label="Total Bookings"
              value={bookings.length}
              sub={`Avg ₱${avgValue.toLocaleString()} per booking`}
              color="#2563eb"
            />
            <StatCard
              icon={<PeopleIcon />}
              label="Unique Customers"
              value={new Set(bookings.map((b) => b.phone)).size}
              sub={`${frequentCustomers.filter((c) => c.count >= 3).length} regulars (3+ visits)`}
              color="#7c3aed"
            />
          </Stack>

          {/* Status breakdown */}
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Typography fontWeight={600} fontSize={15} mb={2}>Booking Status — {periodLabel}</Typography>
              <Stack direction="row" spacing={2}>
                {statusBreakdown.map(({ status, count }) => (
                  <Box key={status} sx={{ flex: 1, textAlign: "center" }}>
                    <Chip label={count} color={STATUS_COLOR[status]} size="small"
                      sx={{ fontSize: 14, fontWeight: 700, height: 28, mb: 0.5 }} />
                    <Typography fontSize={12} color="text.secondary" textTransform="capitalize">{status}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {/* Top Services */}
            <Card sx={{ flex: 1, boxShadow: 1 }}>
              <CardContent>
                <Typography fontWeight={600} fontSize={15} mb={2}>Top Services — {periodLabel}</Typography>
                {topServices.length === 0 ? (
                  <Typography fontSize={13} color="text.disabled">No data</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {topServices.map(([id, count]) => (
                      <Box key={id}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography fontSize={13}>{SERVICE_LABELS[id] || id}</Typography>
                          <Typography fontSize={13} fontWeight={600}>{count}x</Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={(count / maxServiceCount) * 100}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Frequent Customers */}
            <Card sx={{ flex: 1.4, boxShadow: 1 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <StarIcon sx={{ color: "#f59e0b", fontSize: 18 }} />
                  <Typography fontWeight={600} fontSize={15}>Frequent Customers (All Time)</Typography>
                </Stack>
                <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>Customer</TableCell>
                        <TableCell align="center" sx={{ fontSize: 12, fontWeight: 600 }}>Visits</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>Revenue</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>Last Visit</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {frequentCustomers.map((c, i) => (
                        <TableRow key={c.phone} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 26, height: 26, fontSize: 12, bgcolor: i < 3 ? "warning.light" : "grey.200", color: i < 3 ? "warning.dark" : "text.secondary" }}>
                                {i < 3 ? <StarIcon sx={{ fontSize: 13 }} /> : c.name[0]}
                              </Avatar>
                              <Box>
                                <Typography fontSize={13} fontWeight={500}>{maskName(c.name)}</Typography>
                                <Typography fontSize={11} color="text.disabled">{maskPhone(c.phone)}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={c.count} size="small" color={c.count >= 5 ? "warning" : "default"}
                              sx={{ fontSize: 11, height: 20, fontWeight: 600 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontSize={13} fontWeight={500} color="success.main">
                              ₱{c.revenue.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontSize={12} color="text.secondary">{c.lastDate}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </CardContent>
            </Card>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
