import { useEffect, useState } from "react";
import { getAllBusinesses, updateBusiness } from "../services/businessService";
import { db, auth } from "../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { createBusiness } from "../services/businessService";
import { useAuth } from "../context/AuthContext";
import {
  Box, Typography, Card, CardContent, Stack, Button, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Avatar, IconButton, Snackbar, Alert,
  Tooltip, Drawer, Divider, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, useMediaQuery, useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalCarWashIcon from "@mui/icons-material/LocalCarWash";
import MenuIcon from "@mui/icons-material/Menu";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LanguageIcon from "@mui/icons-material/Language";

const PLANS    = ["starter", "pro", "enterprise"];
const INIT_FORM = { name: "", slug: "", email: "", password: "", phone: "", address: "", plan: "starter" };

export default function SuperAdmin() {
  const { logout, user } = useAuth();
  const theme            = useTheme();
  const isMobile         = useMediaQuery(theme.breakpoints.down("md"));

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null); // selected tenant
  const [packages, setPackages]     = useState([]);
  const [open, setOpen]             = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm]             = useState(INIT_FORM);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState({ open: false, msg: "", severity: "success" });

  const load = () => getAllBusinesses().then(setBusinesses).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const selectTenant = async (biz) => {
    setSelected(biz);
    setDrawerOpen(false);
    const snap = await getDocs(query(collection(db, "services"), where("businessId", "==", biz.id)));
    setPackages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.email || !form.password) return;
    setSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await createBusiness(cred.user.uid, { name: form.name, slug: form.slug.toLowerCase().replace(/\s+/g, "-"), phone: form.phone, address: form.address, plan: form.plan, active: true });
      setToast({ open: true, msg: `${form.name} created!`, severity: "success" });
      setOpen(false); setForm(INIT_FORM); load();
    } catch (e) { setToast({ open: true, msg: e.message, severity: "error" }); }
    finally     { setSaving(false); }
  };

  const toggleActive = async (biz) => {
    await updateBusiness(biz.id, { active: !biz.active });
    setBusinesses((prev) => prev.map((b) => b.id === biz.id ? { ...b, active: !b.active } : b));
    if (selected?.id === biz.id) setSelected((s) => ({ ...s, active: !s.active }));
    setToast({ open: true, msg: `${biz.name} ${biz.active ? "suspended" : "activated"}`, severity: "info" });
  };

  const stats = [
    { label: "Total",     value: businesses.length,                                         color: "#2563eb" },
    { label: "Active",    value: businesses.filter((b) => b.active).length,                 color: "#16a34a" },
    { label: "Suspended", value: businesses.filter((b) => !b.active).length,                color: "#dc2626" },
    { label: "Pro+",      value: businesses.filter((b) => b.plan !== "starter").length,     color: "#7c3aed" },
  ];

  // Tenant list sidebar
  const TenantList = () => (
    <Box sx={{ width: 260, height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
            <LocalCarWashIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography fontWeight={700} fontSize={14}>Sudz Saas Pro</Typography>
            <Typography fontSize={11} color="text.secondary">Superadmin</Typography>
          </Box>
        </Stack>
      </Box>
      <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Button fullWidth size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add Tenant
        </Button>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List dense>
          {businesses.map((biz) => (
            <ListItem key={biz.id} disablePadding>
              <ListItemButton selected={selected?.id === biz.id} onClick={() => selectTenant(biz)}
                sx={{ "&.Mui-selected": { bgcolor: "primary.50", borderRight: "3px solid", borderColor: "primary.main" } }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Avatar src={biz.logoUrl} sx={{ width: 28, height: 28, fontSize: 12, bgcolor: "primary.light", color: "primary.main" }}>
                    {!biz.logoUrl && biz.name?.[0]}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={<Typography fontSize={13} fontWeight={500}>{biz.name}</Typography>}
                  secondary={
                    <Stack direction="row" spacing={0.5} mt={0.3}>
                      <Chip label={biz.plan} size="small" sx={{ fontSize: 9, height: 14 }} />
                      <Chip label={biz.active ? "Active" : "Suspended"} size="small"
                        color={biz.active ? "success" : "error"} sx={{ fontSize: 9, height: 14 }} />
                    </Stack>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      <Divider />
      <Box sx={{ p: 1 }}>
        <Button fullWidth size="small" color="error" startIcon={<LogoutIcon />} onClick={logout}>Sign Out</Button>
      </Box>
    </Box>
  );

  // Tenant detail view
  const TenantDetail = () => {
    if (!selected) return (
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "text.disabled", p: 4 }}>
        <StorefrontIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
        <Typography fontSize={15}>Select a tenant to view details</Typography>
      </Box>
    );

    return (
      <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, md: 4 } }}>
        {/* Mobile back button */}
        {isMobile && (
          <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => setSelected(null)} sx={{ mb: 2 }}>
            All Tenants
          </Button>
        )}

        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} mb={3} spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={selected.logoUrl} sx={{ width: 56, height: 56, bgcolor: "primary.light", color: "primary.main", fontSize: 22, fontWeight: 700 }}>
              {!selected.logoUrl && selected.name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>{selected.name}</Typography>
              <Stack direction="row" spacing={1} mt={0.5}>
                <Chip label={selected.plan} size="small" color={selected.plan === "enterprise" ? "secondary" : selected.plan === "pro" ? "primary" : "default"} sx={{ fontSize: 11, textTransform: "capitalize" }} />
                <Chip label={selected.active ? "Active" : "Suspended"} size="small" color={selected.active ? "success" : "error"} sx={{ fontSize: 11 }} />
              </Stack>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Open booking page">
              <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />}
                onClick={() => window.open(`/book/${selected.slug || `?biz=${selected.id}`}`, "_blank")}>
                Booking Page
              </Button>
            </Tooltip>
            <Button size="small" variant="outlined" color={selected.active ? "error" : "success"}
              startIcon={selected.active ? <BlockIcon /> : <CheckCircleIcon />}
              onClick={() => toggleActive(selected)}>
              {selected.active ? "Suspend" : "Activate"}
            </Button>
          </Stack>
        </Stack>

        {/* Info cards */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
          <Card sx={{ flex: 1, boxShadow: 1 }}>
            <CardContent sx={{ py: "12px !important" }}>
              <Typography fontSize={12} color="text.secondary">Phone</Typography>
              <Typography fontSize={14} fontWeight={500}>{selected.phone || "—"}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 2, boxShadow: 1 }}>
            <CardContent sx={{ py: "12px !important" }}>
              <Typography fontSize={12} color="text.secondary">Address</Typography>
              <Typography fontSize={14} fontWeight={500}>{selected.address || "—"}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, boxShadow: 1 }}>
            <CardContent sx={{ py: "12px !important" }}>
              <Typography fontSize={12} color="text.secondary">Created</Typography>
              <Typography fontSize={14} fontWeight={500}>{selected.createdAt?.toDate?.().toLocaleDateString() || "—"}</Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* Subscription card */}
        {(() => {
          const createdAt   = selected.createdAt?.toDate?.();
          const subStart    = selected.subscriptionStart ? new Date(selected.subscriptionStart) : createdAt;
          const subEnd      = selected.subscriptionEnd   ? new Date(selected.subscriptionEnd)   : null;
          const now         = new Date();
          const daysActive  = createdAt ? Math.floor((now - createdAt) / 86400000) : null;
          const daysLeft    = subEnd ? Math.max(0, Math.floor((subEnd - now) / 86400000)) : null;
          const isExpired   = subEnd && now > subEnd;
          const planColor   = selected.plan === "enterprise" ? "secondary" : selected.plan === "pro" ? "warning" : "default";
          return (
            <Card sx={{ boxShadow: 1, mb: 3, border: isExpired ? "1.5px solid" : "none", borderColor: "error.light" }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography fontWeight={700} fontSize={15}>Subscription</Typography>
                    <Typography fontSize={12} color="text.secondary">Billing & plan details</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={selected.plan?.toUpperCase() || "FREE"} size="small" color={planColor} sx={{ fontWeight: 700 }} />
                    {isExpired
                      ? <Chip label="EXPIRED" size="small" color="error" sx={{ fontWeight: 700 }} />
                      : selected.plan !== "starter"
                      ? <Chip label="ACTIVE" size="small" color="success" sx={{ fontWeight: 700 }} />
                      : null
                    }
                  </Stack>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Box sx={{ flex: 1, bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
                    <Typography fontSize={11} color="text.secondary" mb={0.3}>Member Since</Typography>
                    <Typography fontSize={14} fontWeight={600}>{createdAt?.toLocaleDateString() || "—"}</Typography>
                    {daysActive !== null && <Typography fontSize={11} color="text.disabled">{daysActive} days ago</Typography>}
                  </Box>
                  <Box sx={{ flex: 1, bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
                    <Typography fontSize={11} color="text.secondary" mb={0.3}>Plan Started</Typography>
                    <Typography fontSize={14} fontWeight={600}>{subStart?.toLocaleDateString() || "—"}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, bgcolor: isExpired ? "error.50" : daysLeft !== null && daysLeft <= 7 ? "warning.50" : "grey.50", borderRadius: 2, p: 1.5 }}>
                    <Typography fontSize={11} color="text.secondary" mb={0.3}>Plan Expires</Typography>
                    <Typography fontSize={14} fontWeight={600} color={isExpired ? "error.main" : daysLeft !== null && daysLeft <= 7 ? "warning.main" : "text.primary"}>
                      {subEnd ? subEnd.toLocaleDateString() : selected.plan === "starter" ? "No expiry" : "—"}
                    </Typography>
                    {daysLeft !== null && !isExpired && <Typography fontSize={11} color={daysLeft <= 7 ? "warning.main" : "text.disabled"}>{daysLeft} days left</Typography>}
                    {isExpired && <Typography fontSize={11} color="error.main">Expired</Typography>}
                  </Box>
                  <Box sx={{ flex: 1, bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
                    <Typography fontSize={11} color="text.secondary" mb={0.3}>Monthly Rate</Typography>
                    <Typography fontSize={14} fontWeight={600} color="success.main">
                      {selected.plan === "pro" ? "₱149/mo" : selected.plan === "enterprise" ? "₱1,499/12mo" : "Free"}
                    </Typography>
                  </Box>
                </Stack>

                {/* Superadmin actions */}
                <Stack direction="row" spacing={1} mt={2}>
                  <Button size="small" variant="outlined" color="warning"
                    onClick={async () => {
                      const end = new Date();
                      end.setMonth(end.getMonth() + 1);
                      await updateBusiness(selected.id, { plan: "pro", subscriptionStart: new Date().toISOString(), subscriptionEnd: end.toISOString() });
                      setSelected((s) => ({ ...s, plan: "pro", subscriptionStart: new Date().toISOString(), subscriptionEnd: end.toISOString() }));
                      setBusinesses((prev) => prev.map((b) => b.id === selected.id ? { ...b, plan: "pro" } : b));
                      setToast({ open: true, msg: "Upgraded to Pro for 1 month!", severity: "success" });
                    }}>
                    Set Pro (1 mo)
                  </Button>
                  <Button size="small" variant="outlined" color="secondary"
                    onClick={async () => {
                      const end = new Date();
                      end.setFullYear(end.getFullYear() + 1);
                      await updateBusiness(selected.id, { plan: "enterprise", subscriptionStart: new Date().toISOString(), subscriptionEnd: end.toISOString() });
                      setSelected((s) => ({ ...s, plan: "enterprise", subscriptionStart: new Date().toISOString(), subscriptionEnd: end.toISOString() }));
                      setBusinesses((prev) => prev.map((b) => b.id === selected.id ? { ...b, plan: "enterprise" } : b));
                      setToast({ open: true, msg: "Set to Enterprise (12 months)!", severity: "success" });
                    }}>
                    Set Enterprise (12mo)
                  </Button>
                  <Button size="small" variant="outlined" color="error"
                    onClick={async () => {
                      await updateBusiness(selected.id, { plan: "starter", subscriptionEnd: null });
                      setSelected((s) => ({ ...s, plan: "starter" }));
                      setBusinesses((prev) => prev.map((b) => b.id === selected.id ? { ...b, plan: "starter" } : b));
                      setToast({ open: true, msg: "Downgraded to Free", severity: "info" });
                    }}>
                    Downgrade to Free
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })()}

        {/* Social links */}
        {selected.social && Object.values(selected.social).some(Boolean) && (
          <Card sx={{ boxShadow: 1, mb: 3 }}>
            <CardContent sx={{ py: "12px !important" }}>
              <Typography fontSize={12} color="text.secondary" mb={1}>Social & Contact</Typography>
              <Stack direction="row" spacing={1}>
                {selected.social?.facebook  && <IconButton size="small" href={selected.social.facebook}  target="_blank"><FacebookIcon  sx={{ color: "#1877f2" }} /></IconButton>}
                {selected.social?.instagram && <IconButton size="small" href={selected.social.instagram} target="_blank"><InstagramIcon sx={{ color: "#e1306c" }} /></IconButton>}
                {selected.social?.whatsapp  && <IconButton size="small" href={`https://wa.me/${selected.social.whatsapp.replace(/\D/g,"")}`} target="_blank"><WhatsAppIcon sx={{ color: "#25d366" }} /></IconButton>}
                {selected.social?.website   && <IconButton size="small" href={selected.social.website}   target="_blank"><LanguageIcon  sx={{ color: "#2563eb" }} /></IconButton>}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Packages / Services */}
        <Card sx={{ boxShadow: 1 }}>
          <CardContent>
            <Typography fontWeight={600} fontSize={15} mb={2}>
              Services & Packages ({packages.length})
            </Typography>
            {packages.length === 0 ? (
              <Typography fontSize={13} color="text.disabled">No custom services — using defaults.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {packages.map((pkg) => (
                  <Card key={pkg.id} variant="outlined">
                    <CardContent sx={{ py: "10px !important" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                            <Chip label={pkg.isPackage ? "Package" : "Service"} size="small"
                              color={pkg.isPackage ? "primary" : "default"} sx={{ fontSize: 10, height: 18 }} />
                            <Typography fontSize={13} fontWeight={600}>{pkg.name}</Typography>
                          </Stack>
                          {pkg.inclusions?.length > 0 && (
                            <Stack direction="row" flexWrap="wrap" gap={0.5} mb={1}>
                              {pkg.inclusions.map((inc) => (
                                <Chip key={inc} label={inc} size="small" variant="outlined" sx={{ fontSize: 10, height: 16 }} />
                              ))}
                            </Stack>
                          )}
                        </Box>
                        <Box sx={{ textAlign: "right", ml: 2 }}>
                          {pkg.isPackage
                            ? <Stack spacing={0.3}>
                                {Object.entries(pkg.sizes || {}).map(([size, price]) => (
                                  <Typography key={size} fontSize={12} color="text.secondary">
                                    {size}: <strong>₱{price.toLocaleString()}</strong>
                                  </Typography>
                                ))}
                              </Stack>
                            : <Chip label={`₱${pkg.price?.toLocaleString()}`} size="small" color="success" variant="outlined" />
                          }
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", bgcolor: "grey.50" }}>

      {/* Mobile top bar */}
      {isMobile && (
        <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, bgcolor: "white", borderBottom: "1px solid", borderColor: "divider", px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton size="small" onClick={() => setDrawerOpen(true)}><MenuIcon /></IconButton>
          <Typography fontWeight={700} fontSize={15}>Sudz Saas Pro</Typography>
          <Box flex={1} />
          <IconButton size="small" onClick={logout}><LogoutIcon fontSize="small" /></IconButton>
        </Box>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <Box sx={{ width: 260, flexShrink: 0, borderRight: "1px solid", borderColor: "divider", bgcolor: "white", height: "100vh", overflow: "hidden" }}>
          <TenantList />
        </Box>
      )}

      {/* Mobile drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <TenantList />
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", mt: isMobile ? "56px" : 0 }}>

        {/* Stats bar */}
        <Box sx={{ bgcolor: "white", borderBottom: "1px solid", borderColor: "divider", px: { xs: 2, md: 3 }, py: 1.5 }}>
          <Stack direction="row" spacing={{ xs: 1, md: 2 }}>
            {stats.map(({ label, value, color }) => (
              <Box key={label} sx={{ textAlign: "center", minWidth: 60 }}>
                <Typography fontSize={{ xs: 18, md: 22 }} fontWeight={700} color={color} lineHeight={1}>{value}</Typography>
                <Typography fontSize={10} color="text.secondary">{label}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Detail or list on mobile */}
        {isMobile && !selected ? (
          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            <Stack spacing={1.5}>
              {businesses.map((biz) => (
                <Card key={biz.id} sx={{ boxShadow: 1, cursor: "pointer" }} onClick={() => selectTenant(biz)}>
                  <CardContent sx={{ py: "12px !important" }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar src={biz.logoUrl} sx={{ width: 40, height: 40, bgcolor: "primary.light", color: "primary.main", fontWeight: 700 }}>
                        {!biz.logoUrl && biz.name?.[0]}
                      </Avatar>
                      <Box flex={1}>
                        <Typography fontSize={14} fontWeight={600}>{biz.name}</Typography>
                        <Typography fontSize={12} color="text.secondary">{biz.phone}</Typography>
                        <Stack direction="row" spacing={0.5} mt={0.5}>
                          <Chip label={biz.plan} size="small" sx={{ fontSize: 10, height: 16, textTransform: "capitalize" }} />
                          <Chip label={biz.active ? "Active" : "Suspended"} size="small" color={biz.active ? "success" : "error"} sx={{ fontSize: 10, height: 16 }} />
                        </Stack>
                      </Box>
                      <OpenInNewIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        ) : (
          <TenantDetail />
        )}
      </Box>

      {/* Add Tenant Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Add New Tenant</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Business Name" fullWidth size="small" value={form.name} onChange={set("name")} required />
              <TextField label="Slug" fullWidth size="small" value={form.slug} onChange={set("slug")} helperText="e.g. patricks-carwash" required />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Owner Email" type="email" fullWidth size="small" value={form.email} onChange={set("email")} required />
              <TextField label="Password" type="password" fullWidth size="small" value={form.password} onChange={set("password")} required />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Phone" fullWidth size="small" value={form.phone} onChange={set("phone")} />
              <TextField label="Plan" select fullWidth size="small" value={form.plan} onChange={set("plan")}>
                {PLANS.map((p) => <MenuItem key={p} value={p} sx={{ textTransform: "capitalize" }}>{p}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField label="Address" fullWidth size="small" value={form.address} onChange={set("address")} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Tenant"}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
