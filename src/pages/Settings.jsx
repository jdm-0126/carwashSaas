import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { getBusiness, updateBusiness } from "../services/businessService";
import { db, storage } from "../services/firebase";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createWorker } from "tesseract.js";
import {
  Box, Typography, Card, CardContent, CardHeader, TextField, Button,
  Stack, Switch, FormControlLabel, Divider, Alert, Snackbar, Avatar,
  IconButton, Tooltip, Table, TableBody, TableCell, TableHead,
  TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, CircularProgress, Chip, Tabs, Tab, LinearProgress,
  ToggleButton, ToggleButtonGroup, List, ListItem, ListItemIcon, ListItemText,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkIcon from "@mui/icons-material/Link";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ImageSearchIcon from "@mui/icons-material/ImageSearch";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import ArrowDropDownCircleIcon from "@mui/icons-material/ArrowDropDownCircle";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LanguageIcon from "@mui/icons-material/Language";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StarIcon from "@mui/icons-material/Star";
import LockIcon from "@mui/icons-material/Lock";

const DAYS      = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DEF_HOURS = DAYS.reduce((acc, d) => ({ ...acc, [d]: { open: true, from: "08:00", to: "18:00" } }), {});
const INIT_SVC  = { name: "", price: "", duration: "" };
const SIZES     = ["Sub-Compact","Small","Medium","Large","X-Large"];
const INIT_PKG  = { name: "", inclusions: "", sizes: SIZES.reduce((a, s) => ({ ...a, [s]: "" }), {}) };
const INIT_SOC  = { facebook: "", instagram: "", whatsapp: "", website: "" };
const INIT_PAY  = { gcash: "", gcashQr: "", maya: "", mayaQr: "", gotym: "", gotymQr: "", bank: "" };

export default function Settings() {
  const { user, logout, business, refreshBusiness } = useAuth();
  const uid  = user?.uid;
  const plan = business?.plan || "starter";

  const PLAN_LIMITS = { starter: 10, pro: 500, enterprise: Infinity };
  const PLAN_LIMIT  = PLAN_LIMITS[plan] ?? 10;

  const [biz, setBiz]           = useState({ name: "", phone: "", address: "", description: "", slug: "" });
  const [slugError, setSlugError] = useState("");
  const [slugSaving, setSlugSaving] = useState(false);
  const [social, setSocial]     = useState(INIT_SOC);
  const [payment, setPayment]   = useState(INIT_PAY);
  const [logoUrl, setLogoUrl]   = useState("");
  const [logoLoading, setLogoLoading] = useState(false);
  const [hours, setHours]       = useState(DEF_HOURS);
  const [services, setServices] = useState([]);
  const [displayMode, setDisplayMode] = useState("cards"); // "cards" | "list" | "dropdown"
  const [svcForm, setSvcForm]   = useState(INIT_SVC);
  const [pkgForm, setPkgForm]   = useState(INIT_PKG);
  const [editSvc, setEditSvc]   = useState(null); // service being edited
  const [svcOpen, setSvcOpen]   = useState(false);
  const [svcTab, setSvcTab]     = useState(0);
  const [ocrImage, setOcrImage] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrParsed, setOcrParsed]     = useState([]);
  const [ocrLoading, setOcrLoading]   = useState(false);
  const ocrFileRef = useRef();
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState({ open: false, msg: "", severity: "success" });
  const fileRef = useRef();

  const bookingLink = `${window.location.origin}/book/${biz.slug || business?.slug || uid}`;
  const showToast   = (msg, severity = "success") => setToast({ open: true, msg, severity });

  useEffect(() => {
    if (!uid) return;
    getBusiness(uid).then((data) => {
      if (!data) return;
      setBiz({ name: data.name || "", phone: data.phone || "", address: data.address || "", description: data.description || "", slug: data.slug || "" });
      if (data.businessHours) setHours(data.businessHours);
      if (data.logoUrl)       setLogoUrl(data.logoUrl);
      if (data.social)        setSocial({ ...INIT_SOC, ...data.social });
      if (data.payment)       setPayment({ ...INIT_PAY, ...data.payment });
      if (data.displayMode)   setDisplayMode(data.displayMode);
    });
    loadServices();
  }, [uid]);

  const loadServices = async () => {
    if (!uid) return;
    const snap = await getDocs(query(collection(db, "services"), where("businessId", "==", uid)));
    setServices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    try {
      const r   = ref(storage, `logos/${uid}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateBusiness(uid, { logoUrl: url });
      setLogoUrl(url);
      await refreshBusiness();
      showToast("Logo updated!");
    } catch { showToast("Failed to upload logo", "error"); }
    finally  { setLogoLoading(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    await updateBusiness(uid, { name: biz.name, phone: biz.phone, address: biz.address, description: biz.description, social, payment, displayMode });
    showToast("Profile saved!");
    setSaving(false);
  };

  const toSlug = (val) => val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const saveSlug = async () => {
    const slug = biz.slug.trim();
    if (!slug) { setSlugError("Slug cannot be empty"); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { setSlugError("Only lowercase letters, numbers, and hyphens"); return; }
    setSlugSaving(true);
    setSlugError("");
    try {
      // Check uniqueness
      const { getBusinessBySlug: checkSlug } = await import("../services/businessService");
      const existing = await checkSlug(slug);
      if (existing && existing.id !== uid) { setSlugError("This slug is already taken"); return; }
      await updateBusiness(uid, { slug });
      await refreshBusiness();
      showToast("Booking link updated!");
    } catch { showToast("Failed to save slug", "error"); }
    finally { setSlugSaving(false); }
  };

  const toggleDay = (day) => setHours((h) => ({ ...h, [day]: { ...h[day], open: !h[day].open } }));
  const setTime   = (day, f) => (e) => setHours((h) => ({ ...h, [day]: { ...h[day], [f]: e.target.value } }));
  const saveHours = async () => {
    setSaving(true);
    await updateBusiness(uid, { businessHours: hours });
    showToast("Business hours saved!");
    setSaving(false);
  };

  const addService = async () => {
    if (!svcForm.name || !svcForm.price || !svcForm.duration) return;
    await addDoc(collection(db, "services"), { businessId: uid, name: svcForm.name, price: parseFloat(svcForm.price), duration: svcForm.duration, createdAt: Timestamp.now() });
    setSvcForm(INIT_SVC); setSvcOpen(false); loadServices(); showToast("Service added!");
  };

  const addPackage = async () => {
    if (!pkgForm.name) return;
    const sizes = {};
    SIZES.forEach((s) => { if (pkgForm.sizes[s]) sizes[s] = parseFloat(pkgForm.sizes[s]); });
    const inclusions = pkgForm.inclusions.split("\n").map((l) => l.trim()).filter(Boolean);
    await addDoc(collection(db, "services"), { businessId: uid, name: pkgForm.name, inclusions, sizes, isPackage: true, createdAt: Timestamp.now() });
    setPkgForm(INIT_PKG); setSvcOpen(false); setSvcTab(0); loadServices(); showToast("Package added!");
  };

  const deleteService = async (id) => {
    await deleteDoc(doc(db, "services", id));
    setServices((prev) => prev.filter((s) => s.id !== id));
    showToast("Deleted", "info");
  };

  const saveEditSvc = async () => {
    if (!editSvc) return;
    const { id, name, price, duration, sizes, inclusions } = editSvc;
    const update = editSvc.isPackage
      ? { name, sizes, inclusions }
      : { name, price: parseFloat(price), duration };
    await updateDoc(doc(db, "services", id), update);
    setEditSvc(null);
    loadServices();
    showToast("Service updated!");
  };

  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrImage(URL.createObjectURL(file));
    setOcrLoading(true); setOcrParsed([]); setOcrProgress(0);
    try {
      const worker = await createWorker("eng", 1, { logger: (m) => { if (m.status === "recognizing text") setOcrProgress(Math.round(m.progress * 100)); } });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      const parsed = parseServicesFromText(text);
      setOcrParsed(parsed);
      if (!parsed.length) showToast("No services detected — try a clearer image", "warning");
    } catch { showToast("OCR failed", "error"); }
    finally  { setOcrLoading(false); }
  };

  const parseServicesFromText = (text) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const results = [];
    const priceRe = /[₱P]?\s*(\d[\d,]*)/;
    const durRe   = /(\d+\s*(?:min|hr|hour|mins|hours))/i;
    for (const line of lines) {
      const pm = line.match(priceRe);
      const dm = line.match(durRe);
      if (!pm) continue;
      const price = parseFloat(pm[1].replace(/,/g, ""));
      if (price < 50 || price > 50000) continue;
      const name = line.replace(priceRe, "").replace(durRe, "").replace(/[-–:|]/g, "").trim();
      if (name.length < 3) continue;
      results.push({ name, price, duration: dm?.[1] || "" });
    }
    return results;
  };

  const saveOcrServices = async () => {
    for (const s of ocrParsed)
      await addDoc(collection(db, "services"), { businessId: uid, name: s.name, price: s.price, duration: s.duration, createdAt: Timestamp.now() });
    setOcrParsed([]); setOcrImage(null); setSvcOpen(false); setSvcTab(0);
    loadServices(); showToast(`${ocrParsed.length} services added!`);
  };

  const uploadQr = async (method, file) => {
    if (!file) return;
    try {
      const r   = ref(storage, `qrcodes/${uid}/${method}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      const updated = { ...payment, [`${method}Qr`]: url };
      setPayment(updated);
      await updateBusiness(uid, { payment: updated });
      showToast(`${method} QR uploaded!`);
    } catch { showToast("QR upload failed", "error"); }
  };

  const copyLink = () => { navigator.clipboard.writeText(bookingLink); showToast("Booking link copied!"); };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 720 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>Settings</Typography>

      {/* Account */}
      <Card sx={{ boxShadow: 1, mb: 3 }}>
        <CardHeader avatar={<AccountCircleIcon color="primary" />} title="Account" titleTypographyProps={{ fontWeight: 700, fontSize: 16 }} />
        <Divider />
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography fontSize={14} fontWeight={500}>{user?.email}</Typography>
              <Typography fontSize={12} color="text.secondary">Owner</Typography>
            </Box>
            <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={logout}>Sign Out</Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card sx={{ boxShadow: 1, mb: 3, border: plan === "starter" ? "1.5px solid" : "none", borderColor: "warning.light" }}>
        <CardHeader
          avatar={<StarIcon sx={{ color: plan === "pro" ? "#f59e0b" : plan === "enterprise" ? "#7c3aed" : "text.disabled" }} />}
          title="Subscription Plan"
          titleTypographyProps={{ fontWeight: 700, fontSize: 16 }}
          action={
            <Chip
              label={plan.toUpperCase()}
              size="small"
              color={plan === "enterprise" ? "secondary" : plan === "pro" ? "warning" : "default"}
              sx={{ fontWeight: 700, mr: 1, mt: 1 }}
            />
          }
        />
        <Divider />
        <CardContent>
          {/* Usage bar for starter */}
          {plan === "starter" && (
            <Box mb={2.5}>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography fontSize={13} color="text.secondary">Bookings used</Typography>
                <Typography fontSize={13} fontWeight={600} color={business?.bookingCount >= PLAN_LIMIT ? "error.main" : "text.primary"}>
                  {business?.bookingCount ?? "—"} / {PLAN_LIMIT}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(((business?.bookingCount ?? 0) / PLAN_LIMIT) * 100, 100)}
                color={business?.bookingCount >= PLAN_LIMIT ? "error" : business?.bookingCount >= PLAN_LIMIT * 0.8 ? "warning" : "primary"}
                sx={{ height: 8, borderRadius: 4 }}
              />
              {business?.bookingCount >= PLAN_LIMIT && (
                <Alert severity="error" sx={{ mt: 1.5, py: 0.5 }}>
                  Booking limit reached — new bookings are blocked.
                </Alert>
              )}
            </Box>
          )}

          {/* Plan comparison */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            {/* Free */}
            <Card variant="outlined" sx={{ flex: 1, borderColor: plan === "starter" ? "primary.main" : "divider", position: "relative" }}>
              {plan === "starter" && <Chip label="Current" size="small" color="primary" sx={{ position: "absolute", top: -10, left: 12, fontSize: 10, height: 20 }} />}
              <CardContent sx={{ pt: 2.5 }}>
                <Typography fontWeight={700} fontSize={14} mb={0.5}>Free</Typography>
                <Typography fontSize={22} fontWeight={800} color="text.secondary">₱0<Typography component="span" fontSize={12} color="text.disabled">/mo</Typography></Typography>
                <List dense disablePadding sx={{ mt: 1 }}>
                  {["10 bookings total","1 business profile","Basic booking page"].map((f) => (
                    <ListItem key={f} disablePadding sx={{ py: 0.2 }}>
                      <ListItemIcon sx={{ minWidth: 22 }}><CheckCircleIcon sx={{ fontSize: 14, color: "text.disabled" }} /></ListItemIcon>
                      <ListItemText primary={<Typography fontSize={12} color="text.secondary">{f}</Typography>} />
                    </ListItem>
                  ))}
                  {["Unlimited bookings","Custom packages","Reports & analytics"].map((f) => (
                    <ListItem key={f} disablePadding sx={{ py: 0.2 }}>
                      <ListItemIcon sx={{ minWidth: 22 }}><LockIcon sx={{ fontSize: 13, color: "error.light" }} /></ListItemIcon>
                      <ListItemText primary={<Typography fontSize={12} color="text.disabled" sx={{ textDecoration: "line-through" }}>{f}</Typography>} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Pro — highlighted */}
            <Card variant="outlined" sx={{ flex: 1, borderColor: plan === "pro" ? "warning.main" : "#f59e0b", borderWidth: 2, position: "relative", bgcolor: "#fffbeb" }}>
              <Chip label="⭐ RECOMMENDED" size="small" color="warning" sx={{ position: "absolute", top: -10, left: 12, fontSize: 10, height: 20, fontWeight: 700 }} />
              {plan === "pro" && <Chip label="Current" size="small" color="warning" sx={{ position: "absolute", top: -10, right: 12, fontSize: 10, height: 20 }} />}
              <CardContent sx={{ pt: 2.5 }}>
                <Typography fontWeight={700} fontSize={14} mb={0.5}>Pro</Typography>
                <Stack direction="row" alignItems="baseline" spacing={0.5}>
                  <Typography fontSize={22} fontWeight={800} color="warning.dark">₱149<Typography component="span" fontSize={12} color="text.secondary">/mo</Typography></Typography>
                </Stack>
                <List dense disablePadding sx={{ mt: 1 }}>
                  {["500 bookings/month","Custom packages & services","Reports & analytics","Business hours control","Shareable booking link","Social media links"].map((f) => (
                    <ListItem key={f} disablePadding sx={{ py: 0.2 }}>
                      <ListItemIcon sx={{ minWidth: 22 }}><CheckCircleIcon sx={{ fontSize: 14, color: "warning.main" }} /></ListItemIcon>
                      <ListItemText primary={<Typography fontSize={12} fontWeight={500}>{f}</Typography>} />
                    </ListItem>
                  ))}
                </List>
                {plan !== "pro" && (
                  <Button variant="contained" color="warning" fullWidth size="small" sx={{ mt: 2, fontWeight: 700 }}
                    href={`https://wa.me/639XXXXXXXXX?text=${encodeURIComponent("Hi! I want to upgrade to Pro plan (₱149/mo) for " + (biz.name || "my business"))}`}
                    target="_blank">
                    Upgrade to Pro — ₱149/mo
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card variant="outlined" sx={{ flex: 1, borderColor: plan === "enterprise" ? "secondary.main" : "divider", position: "relative" }}>
              {plan === "enterprise" && <Chip label="Current" size="small" color="secondary" sx={{ position: "absolute", top: -10, left: 12, fontSize: 10, height: 20 }} />}
              <CardContent sx={{ pt: 2.5 }}>
                <Typography fontWeight={700} fontSize={14} mb={0.5}>Enterprise</Typography>
                <Typography fontSize={22} fontWeight={800} color="secondary.main">₱1,499<Typography component="span" fontSize={12} color="text.secondary">/12mo</Typography></Typography>
                <Typography fontSize={11} color="text.disabled" mb={1}>One-time payment · 12 months access</Typography>
                <List dense disablePadding sx={{ mt: 1 }}>
                  {["Unlimited bookings","Multiple branches","Priority support","Custom integrations","SMS notifications","Dedicated onboarding"].map((f) => (
                    <ListItem key={f} disablePadding sx={{ py: 0.2 }}>
                      <ListItemIcon sx={{ minWidth: 22 }}><CheckCircleIcon sx={{ fontSize: 14, color: "secondary.main" }} /></ListItemIcon>
                      <ListItemText primary={<Typography fontSize={12} fontWeight={500}>{f}</Typography>} />
                    </ListItem>
                  ))}
                </List>
                {plan !== "enterprise" && (
                  <Button variant="outlined" color="secondary" fullWidth size="small" sx={{ mt: 2 }}
                    href={`https://wa.me/639XXXXXXXXX?text=${encodeURIComponent("Hi! I want the Enterprise plan (₱1,499 / 12 months) for " + (biz.name || "my business"))}`}
                    target="_blank">
                    Get Enterprise — ₱1,499/yr
                  </Button>
                )}
              </CardContent>
            </Card>
          </Stack>
        </CardContent>
      </Card>

      {/* Business Profile + Logo + Social */}
      <Card sx={{ boxShadow: 1, mb: 3 }}>
        <CardHeader avatar={<StorefrontIcon color="primary" />} title="Business Profile"
          subheader="Appears on your booking page header"
          titleTypographyProps={{ fontWeight: 700, fontSize: 16 }} />
        <Divider />
        <CardContent>
          <Stack direction="row" spacing={3} alignItems="flex-start">
            {/* Logo */}
            <Box sx={{ textAlign: "center", flexShrink: 0 }}>
              <Box sx={{ position: "relative", display: "inline-block" }}>
                <Avatar src={logoUrl} sx={{ width: 80, height: 80, bgcolor: "primary.light", fontSize: 28, fontWeight: 700, color: "primary.main" }}>
                  {!logoUrl && biz.name?.[0]}
                </Avatar>
                <IconButton size="small" onClick={() => fileRef.current.click()}
                  sx={{ position: "absolute", bottom: -4, right: -4, bgcolor: "white", border: "1px solid", borderColor: "divider", boxShadow: 1 }}>
                  {logoLoading ? <CircularProgress size={14} /> : <PhotoCameraIcon sx={{ fontSize: 14 }} />}
                </IconButton>
              </Box>
              <Typography fontSize={11} color="text.secondary" mt={1}>Logo</Typography>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleLogoChange} />
            </Box>

            {/* Fields */}
            <Stack spacing={2} flex={1}>
              <Stack direction="row" spacing={2}>
                <TextField label="Business Name" size="small" fullWidth value={biz.name} onChange={(e) => setBiz((b) => ({ ...b, name: e.target.value }))} />
                <TextField label="Phone" size="small" fullWidth value={biz.phone} onChange={(e) => setBiz((b) => ({ ...b, phone: e.target.value }))} />
              </Stack>
              <TextField label="Address" size="small" fullWidth value={biz.address} onChange={(e) => setBiz((b) => ({ ...b, address: e.target.value }))} />
              <TextField label="Description / Tagline" size="small" fullWidth value={biz.description} onChange={(e) => setBiz((b) => ({ ...b, description: e.target.value }))} />

              <Divider />
              <Typography fontSize={13} fontWeight={600} color="text.secondary">Payment Methods (shown to customers)</Typography>

              {/* GCash */}
              <Stack direction={{ xs:"column", sm:"row" }} spacing={2} alignItems="flex-start">
                <TextField label="GCash Number" size="small" sx={{ flex:1 }} value={payment.gcash}
                  onChange={(e) => setPayment((p) => ({ ...p, gcash: e.target.value }))}
                  placeholder="+639XXXXXXXXX"
                  InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={12} fontWeight={800} color="#007bff">G</Typography></InputAdornment> }} />
                <Box sx={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0.5 }}>
                  {payment.gcashQr
                    ? <Box sx={{ position:"relative" }}>
                        <Box component="img" src={payment.gcashQr} sx={{ width:64, height:64, borderRadius:1, border:"1px solid", borderColor:"divider", objectFit:"cover" }} />
                        <IconButton size="small" sx={{ position:"absolute", top:-8, right:-8, bgcolor:"white", boxShadow:1 }}
                          onClick={() => { const u={...payment,gcashQr:""}; setPayment(u); updateBusiness(uid,{payment:u}); }}>
                          <DeleteIcon sx={{ fontSize:12 }} />
                        </IconButton>
                      </Box>
                    : <Button size="small" variant="outlined" component="label" sx={{ fontSize:10, px:1, whiteSpace:"nowrap" }}>
                        QR Code
                        <input type="file" accept="image/*" hidden onChange={(e) => uploadQr("gcash", e.target.files?.[0])} />
                      </Button>
                  }
                  <Typography fontSize={10} color="text.disabled">GCash QR</Typography>
                </Box>
              </Stack>

              {/* Maya */}
              <Stack direction={{ xs:"column", sm:"row" }} spacing={2} alignItems="flex-start">
                <TextField label="Maya Number" size="small" sx={{ flex:1 }} value={payment.maya}
                  onChange={(e) => setPayment((p) => ({ ...p, maya: e.target.value }))}
                  placeholder="+639XXXXXXXXX"
                  InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={12} fontWeight={800} color="#4caf50">M</Typography></InputAdornment> }} />
                <Box sx={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0.5 }}>
                  {payment.mayaQr
                    ? <Box sx={{ position:"relative" }}>
                        <Box component="img" src={payment.mayaQr} sx={{ width:64, height:64, borderRadius:1, border:"1px solid", borderColor:"divider", objectFit:"cover" }} />
                        <IconButton size="small" sx={{ position:"absolute", top:-8, right:-8, bgcolor:"white", boxShadow:1 }}
                          onClick={() => { const u={...payment,mayaQr:""}; setPayment(u); updateBusiness(uid,{payment:u}); }}>
                          <DeleteIcon sx={{ fontSize:12 }} />
                        </IconButton>
                      </Box>
                    : <Button size="small" variant="outlined" component="label" sx={{ fontSize:10, px:1, whiteSpace:"nowrap" }}>
                        QR Code
                        <input type="file" accept="image/*" hidden onChange={(e) => uploadQr("maya", e.target.files?.[0])} />
                      </Button>
                  }
                  <Typography fontSize={10} color="text.disabled">Maya QR</Typography>
                </Box>
              </Stack>

              {/* GotYm */}
              <Stack direction={{ xs:"column", sm:"row" }} spacing={2} alignItems="flex-start">
                <TextField label="GotYm Number" size="small" sx={{ flex:1 }} value={payment.gotym}
                  onChange={(e) => setPayment((p) => ({ ...p, gotym: e.target.value }))}
                  placeholder="+639XXXXXXXXX"
                  InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={12} fontWeight={800} color="#ff6b35">G</Typography></InputAdornment> }} />
                <Box sx={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0.5 }}>
                  {payment.gotymQr
                    ? <Box sx={{ position:"relative" }}>
                        <Box component="img" src={payment.gotymQr} sx={{ width:64, height:64, borderRadius:1, border:"1px solid", borderColor:"divider", objectFit:"cover" }} />
                        <IconButton size="small" sx={{ position:"absolute", top:-8, right:-8, bgcolor:"white", boxShadow:1 }}
                          onClick={() => { const u={...payment,gotymQr:""}; setPayment(u); updateBusiness(uid,{payment:u}); }}>
                          <DeleteIcon sx={{ fontSize:12 }} />
                        </IconButton>
                      </Box>
                    : <Button size="small" variant="outlined" component="label" sx={{ fontSize:10, px:1, whiteSpace:"nowrap" }}>
                        QR Code
                        <input type="file" accept="image/*" hidden onChange={(e) => uploadQr("gotym", e.target.files?.[0])} />
                      </Button>
                  }
                  <Typography fontSize={10} color="text.disabled">GotYm QR</Typography>
                </Box>
              </Stack>

              {/* Bank */}
              <TextField label="Bank / Others" size="small" fullWidth value={payment.bank}
                onChange={(e) => setPayment((p) => ({ ...p, bank: e.target.value }))}
                placeholder="BDO / BPI account number" />

              <Divider />
              <Stack direction="row" spacing={2}>
                <TextField label="Facebook" size="small" fullWidth value={social.facebook}
                  onChange={(e) => setSocial((s) => ({ ...s, facebook: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><FacebookIcon sx={{ fontSize: 16, color: "#1877f2" }} /></InputAdornment> }}
                  placeholder="https://facebook.com/yourpage" />
                <TextField label="Instagram" size="small" fullWidth value={social.instagram}
                  onChange={(e) => setSocial((s) => ({ ...s, instagram: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><InstagramIcon sx={{ fontSize: 16, color: "#e1306c" }} /></InputAdornment> }}
                  placeholder="https://instagram.com/yourpage" />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField label="WhatsApp / Viber" size="small" fullWidth value={social.whatsapp}
                  onChange={(e) => setSocial((s) => ({ ...s, whatsapp: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><WhatsAppIcon sx={{ fontSize: 16, color: "#25d366" }} /></InputAdornment> }}
                  placeholder="+639XXXXXXXXX" />
                <TextField label="Website" size="small" fullWidth value={social.website}
                  onChange={(e) => setSocial((s) => ({ ...s, website: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><LanguageIcon sx={{ fontSize: 16, color: "#2563eb" }} /></InputAdornment> }}
                  placeholder="https://yourwebsite.com" />
              </Stack>

              <Button variant="contained" onClick={saveProfile} disabled={saving} sx={{ alignSelf: "flex-start" }}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Booking Link */}
      <Card sx={{ boxShadow: 1, mb: 3, border: "1.5px solid", borderColor: "primary.light" }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <LinkIcon color="primary" fontSize="small" />
            <Typography fontWeight={700} fontSize={15}>Shareable Booking Link</Typography>
          </Stack>
          <Typography fontSize={12} color="text.secondary" mb={2}>
            Send this link to your customers so they can book directly with{" "}
            <strong>{biz.name || "your business"}</strong>.
          </Typography>

          {/* Slug editor */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mb={2} alignItems="flex-start">
            <TextField
              size="small" fullWidth
              label="Your booking URL name"
              value={biz.slug}
              onChange={(e) => { setBiz((b) => ({ ...b, slug: toSlug(e.target.value) })); setSlugError(""); }}
              error={!!slugError}
              helperText={slugError || `yoursite.com/book/${biz.slug || "your-name"}`}
              InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontSize={12} color="text.disabled">/book/</Typography></InputAdornment> }}
              placeholder="patrick-carwash"
            />
            <Button variant="contained" onClick={saveSlug} disabled={slugSaving}
              sx={{ whiteSpace: "nowrap", minWidth: 100, mt: { xs: 0, sm: "2px" } }}>
              {slugSaving ? "Saving..." : "Save"}
            </Button>
          </Stack>

          {/* Link display */}
          <Box sx={{ bgcolor: "grey.50", border: "1px solid", borderColor: "divider", borderRadius: 2, px: 2, py: 1.5, mb: 2, wordBreak: "break-all" }}>
            <Typography fontSize={13} color="primary.main" fontWeight={500}>{bookingLink}</Typography>
          </Box>

          {/* Action buttons — stacked on mobile */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" fullWidth startIcon={<ContentCopyIcon />} onClick={copyLink}>
              Copy Link
            </Button>
            <Button variant="outlined" fullWidth startIcon={<WhatsAppIcon sx={{ color: "#25d366" }} />}
              href={`https://wa.me/?text=${encodeURIComponent("Book your car wash here: " + bookingLink)}`}
              target="_blank">
              Share via WhatsApp
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Services */}
      <Card sx={{ boxShadow: 1, mb: 3 }}>
        <CardHeader
          avatar={<SettingsIcon color="primary" />}
          title="Services & Packages"
          subheader="Manage what appears on your booking page"
          titleTypographyProps={{ fontWeight: 700, fontSize: 16 }}
          action={<Button size="small" startIcon={<AddIcon />} onClick={() => setSvcOpen(true)} sx={{ mt: 1, mr: 1 }}>Add</Button>}
        />
        <Divider />
        <CardContent>
          {/* Display mode toggle */}
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <Typography fontSize={13} fontWeight={500} color="text.secondary">Booking display:</Typography>
            <ToggleButtonGroup value={displayMode} exclusive size="small"
              onChange={(_, v) => { if (v) { setDisplayMode(v); updateBusiness(uid, { displayMode: v }); } }}>
              <ToggleButton value="cards" sx={{ fontSize: 11, px: 1.5 }}>
                <ViewModuleIcon sx={{ fontSize: 15, mr: 0.5 }} /> Cards
              </ToggleButton>
              <ToggleButton value="list" sx={{ fontSize: 11, px: 1.5 }}>
                <ViewListIcon sx={{ fontSize: 15, mr: 0.5 }} /> List
              </ToggleButton>
              <ToggleButton value="dropdown" sx={{ fontSize: 11, px: 1.5 }}>
                <ArrowDropDownCircleIcon sx={{ fontSize: 15, mr: 0.5 }} /> Dropdown
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {services.length === 0 ? (
            <Typography fontSize={13} color="text.disabled">No custom services yet — defaults will show.</Typography>
          ) : (
            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: 12 }}>Price / Sizes</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {services.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell><Typography fontSize={13}>{s.name}</Typography></TableCell>
                      <TableCell>
                        <Chip label={s.isPackage ? "Package" : "Service"} size="small"
                          color={s.isPackage ? "primary" : "default"} sx={{ fontSize: 10, height: 18 }} />
                      </TableCell>
                      <TableCell align="right">
                        {s.isPackage
                          ? <Stack direction="row" flexWrap="wrap" gap={0.5} justifyContent="flex-end">
                              {Object.entries(s.sizes || {}).map(([sz, p]) => (
                                <Chip key={sz} label={`${sz}: ₱${p}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                              ))}
                            </Stack>
                          : <Chip label={`₱${s.price?.toLocaleString()}`} size="small" color="success" variant="outlined" sx={{ fontSize: 11 }} />
                        }
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" color="primary" onClick={() => setEditSvc({ ...s })}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => deleteService(s.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card sx={{ boxShadow: 1 }}>
        <CardHeader avatar={<SettingsIcon color="primary" />} title="Business Hours"
          titleTypographyProps={{ fontWeight: 700, fontSize: 16 }} />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            {DAYS.map((day) => (
              <Stack key={day} direction="row" alignItems="center" spacing={2}>
                <FormControlLabel sx={{ width: 130, m: 0 }}
                  control={<Switch checked={hours[day].open} onChange={() => toggleDay(day)} size="small" />}
                  label={<Typography fontSize={14} fontWeight={500}>{day}</Typography>} />
                {hours[day].open ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField type="time" size="small" value={hours[day].from} onChange={setTime(day, "from")} sx={{ width: 130 }} />
                    <Typography fontSize={13} color="text.secondary">to</Typography>
                    <TextField type="time" size="small" value={hours[day].to} onChange={setTime(day, "to")} sx={{ width: 130 }} />
                  </Stack>
                ) : <Typography fontSize={13} color="text.disabled">Closed</Typography>}
              </Stack>
            ))}
          </Stack>
          <Button variant="contained" sx={{ mt: 3 }} onClick={saveHours} disabled={saving}>
            {saving ? "Saving..." : "Save Hours"}
          </Button>
        </CardContent>
      </Card>

      {/* Add Service Dialog */}
      <Dialog open={svcOpen} onClose={() => { setSvcOpen(false); setSvcTab(0); setOcrImage(null); setOcrParsed([]); }} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Add Services</DialogTitle>
        <Tabs value={svcTab} onChange={(_, v) => setSvcTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Manual" sx={{ fontSize: 13 }} />
          <Tab label="Package" sx={{ fontSize: 13 }} />
          <Tab label="Scan Price List" icon={<ImageSearchIcon fontSize="small" />} iconPosition="start" sx={{ fontSize: 13 }} />
        </Tabs>
        <DialogContent>
          {svcTab === 0 && (
            <Stack spacing={2} mt={1}>
              <TextField label="Service Name" size="small" fullWidth value={svcForm.name} onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))} />
              <TextField label="Price (₱)" type="number" size="small" fullWidth value={svcForm.price} onChange={(e) => setSvcForm((f) => ({ ...f, price: e.target.value }))} />
              <TextField label="Duration (e.g. 45 min)" size="small" fullWidth value={svcForm.duration} onChange={(e) => setSvcForm((f) => ({ ...f, duration: e.target.value }))} />
            </Stack>
          )}
          {svcTab === 1 && (
            <Stack spacing={2} mt={1}>
              <TextField label="Package Name" size="small" fullWidth value={pkgForm.name}
                onChange={(e) => setPkgForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium Wash & Hand Wax" />
              <TextField label="Inclusions (one per line)" size="small" fullWidth multiline rows={4}
                value={pkgForm.inclusions} onChange={(e) => setPkgForm((f) => ({ ...f, inclusions: e.target.value }))}
                placeholder={"Wash\nVacuum\nHand Wax"} />
              <Typography fontSize={13} fontWeight={600} color="text.secondary">Price per Vehicle Size (₱)</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {SIZES.map((size) => (
                  <TextField key={size} label={size} type="number" size="small" sx={{ width: 120 }}
                    value={pkgForm.sizes[size]} onChange={(e) => setPkgForm((f) => ({ ...f, sizes: { ...f.sizes, [size]: e.target.value } }))} />
                ))}
              </Stack>
            </Stack>
          )}
          {svcTab === 2 && (
            <Stack spacing={2} mt={1}>
              <Typography fontSize={13} color="text.secondary">Take a photo or upload your price list — services will be auto-detected.</Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<PhotoCameraIcon />}
                  onClick={() => { ocrFileRef.current.capture = "environment"; ocrFileRef.current.click(); }}>Camera</Button>
                <Button variant="outlined" startIcon={<ImageSearchIcon />}
                  onClick={() => { ocrFileRef.current.removeAttribute("capture"); ocrFileRef.current.click(); }}>Upload</Button>
                <input ref={ocrFileRef} type="file" accept="image/*" hidden onChange={handleOcrUpload} />
              </Stack>
              {ocrImage && <Box component="img" src={ocrImage} sx={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 2, border: "1px solid", borderColor: "divider" }} />}
              {ocrLoading && <Box><Typography fontSize={12} color="text.secondary" mb={0.5}>Scanning... {ocrProgress}%</Typography><LinearProgress variant="determinate" value={ocrProgress} sx={{ borderRadius: 2 }} /></Box>}
              {ocrParsed.length > 0 && (
                <Box>
                  <Typography fontSize={13} fontWeight={600} mb={1}>Detected ({ocrParsed.length})</Typography>
                  <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                    <Table size="small">
                      <TableHead><TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>Name</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>Price</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>Duration</TableCell>
                        <TableCell />
                      </TableRow></TableHead>
                      <TableBody>
                        {ocrParsed.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell><TextField size="small" value={s.name} variant="standard" onChange={(e) => setOcrParsed((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></TableCell>
                            <TableCell align="right"><TextField size="small" value={s.price} type="number" variant="standard" sx={{ width: 70 }} onChange={(e) => setOcrParsed((p) => p.map((x, j) => j === i ? { ...x, price: parseFloat(e.target.value) } : x))} /></TableCell>
                            <TableCell align="right"><TextField size="small" value={s.duration} variant="standard" sx={{ width: 70 }} onChange={(e) => setOcrParsed((p) => p.map((x, j) => j === i ? { ...x, duration: e.target.value } : x))} /></TableCell>
                            <TableCell align="right"><IconButton size="small" color="error" onClick={() => setOcrParsed((p) => p.filter((_, j) => j !== i))}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setSvcOpen(false); setSvcTab(0); setOcrImage(null); setOcrParsed([]); }}>Cancel</Button>
          {svcTab === 0 && <Button variant="contained" onClick={addService}>Add Service</Button>}
          {svcTab === 1 && <Button variant="contained" onClick={addPackage}>Add Package</Button>}
          {svcTab === 2 && ocrParsed.length > 0 && <Button variant="contained" onClick={saveOcrServices}>Save {ocrParsed.length} Services</Button>}
        </DialogActions>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={!!editSvc} onClose={() => setEditSvc(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Edit {editSvc?.isPackage ? "Package" : "Service"}</DialogTitle>
        <DialogContent>
          {editSvc && (
            <Stack spacing={2} mt={1}>
              <TextField label="Name" size="small" fullWidth value={editSvc.name}
                onChange={(e) => setEditSvc((s) => ({ ...s, name: e.target.value }))} />

              {editSvc.isPackage ? (
                <>
                  <TextField label="Inclusions (one per line)" size="small" fullWidth multiline rows={3}
                    value={Array.isArray(editSvc.inclusions) ? editSvc.inclusions.join("\n") : editSvc.inclusions || ""}
                    onChange={(e) => setEditSvc((s) => ({ ...s, inclusions: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) }))} />
                  <Typography fontSize={13} fontWeight={600} color="text.secondary">Price per Vehicle Size (₱)</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1.5}>
                    {Object.keys(editSvc.sizes || {}).map((size) => (
                      <TextField key={size} label={size} type="number" size="small" sx={{ width: 120 }}
                        value={editSvc.sizes[size] ?? ""}
                        onChange={(e) => setEditSvc((s) => ({ ...s, sizes: { ...s.sizes, [size]: e.target.value === "" ? "" : parseFloat(e.target.value) } }))} />
                    ))}
                  </Stack>
                  <Typography fontSize={12} color="text.secondary">Leave blank to remove a size option.</Typography>
                </>
              ) : (
                <Stack direction="row" spacing={2}>
                  <TextField label="Price (₱)" type="number" size="small" fullWidth value={editSvc.price ?? ""}
                    onChange={(e) => setEditSvc((s) => ({ ...s, price: e.target.value }))} />
                  <TextField label="Duration" size="small" fullWidth value={editSvc.duration ?? ""}
                    onChange={(e) => setEditSvc((s) => ({ ...s, duration: e.target.value }))} />
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditSvc(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEditSvc}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
