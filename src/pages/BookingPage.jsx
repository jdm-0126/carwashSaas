import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createBooking, getConfirmedSlotsForDate, uploadPaymentProof } from "../services/bookingService";
import { getBusinessBySlug, getBusiness } from "../services/businessService";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  Box, Typography, Card, CardContent, Avatar, TextField,
  Button, Stack, Link, Chip, Divider, Radio, RadioGroup,
  FormControlLabel, FormControl, MenuItem, Select, InputLabel,
  Tooltip, IconButton, Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LoginIcon from "@mui/icons-material/Login";
import LocalCarWashIcon from "@mui/icons-material/LocalCarWash";
import CheckIcon from "@mui/icons-material/Check";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LanguageIcon from "@mui/icons-material/Language";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";

const BASE = ["Wash","Vacuum","Dashboard Protection / Armor All","Glass Cleaner","Engine Bay Wiping","Clean Fuel Cover","Pedal Cleaning"];

const DEFAULT_PACKAGES = [
  { id:"pkg1", name:"Premium Wash & Hand Wax",                        extra:["Hand Wax"],                          sizes:{"Sub-Compact":450,"Small":550,"Medium":650,"Large":750,"X-Large":850} },
  { id:"pkg2", name:"Premium Wash & Acid Rain Removal",               extra:["Acid Rain Removal"],                 sizes:{"Sub-Compact":500,"Small":550,"Medium":650,"Large":700,"X-Large":850} },
  { id:"pkg3", name:"Premium Wash & Engine Wash",                     extra:["Full Engine Wash"],                  sizes:{"Sub-Compact":600,"Small":700,"Medium":800,"Large":900,"X-Large":950} },
  { id:"pkg4", name:"Premium Wash & Buffing Wax",                     extra:["Buffing Wax"],                       sizes:{"Sub-Compact":650,"Small":800,"Medium":900,"Large":1000,"X-Large":1150} },
  { id:"pkg5", name:"Premium Wash, Hand Wax & Acid Rain Removal",     extra:["Hand Wax","Acid Rain Removal"],      sizes:{"Sub-Compact":650,"Small":750,"Medium":850,"Large":1000,"X-Large":1150} },
];

// Generate 30-min time slots between from and to (e.g. "08:00" to "18:00")
const generateSlots = (from, to) => {
  const slots = [];
  if (!from || !to) return slots;
  let [h, m] = from.split(":").map(Number);
  const [eh, em] = to.split(":").map(Number);
  while (h < eh || (h === eh && m < em)) {
    slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    m += 30;
    if (m >= 60) { h++; m -= 60; }
  }
  return slots;
};

const DAYS  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const today = new Date().toISOString().split("T")[0];
const INIT  = { customerName:"", phone:"", packageId:"", vehicleSize:"", date:"", time:"", notes:"" };

export default function BookingPage() {
  const navigate       = useNavigate();
  const { slug }       = useParams();
  const [searchParams] = useSearchParams();
  const bizParam       = searchParams.get("biz");

  const [form, setForm]         = useState(INIT);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]           = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [refNumber, setRefNumber]  = useState("");
  const [errors, setErrors]     = useState({});
  const [business, setBusiness] = useState(null);
  const [businessHours, setBusinessHours] = useState(null);
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [displayMode, setDisplayMode] = useState("cards");
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [paymentFile, setPaymentFile]   = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentPreview, setPaymentPreview] = useState("");
  const paymentRef = useRef();

  const { business: ownerBusiness } = useAuth();

  useEffect(() => {
    const load = async () => {
      let data = null;
      if (bizParam)              data = await getBusiness(bizParam);
      else if (slug)             data = await getBusinessBySlug(slug);
      else if (ownerBusiness)    data = ownerBusiness; // owner previewing their own booking page
      if (!data) return;
      setBusiness(data);
      if (data.businessHours) setBusinessHours(data.businessHours);
      if (data.displayMode)   setDisplayMode(data.displayMode);
      const snap = await getDocs(query(collection(db, "services"), where("businessId", "==", data.id)));
      if (!snap.empty) setPackages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    load();
  }, [slug, bizParam, ownerBusiness]);

  const selectedPkg   = packages.find((p) => p.id === form.packageId);
  const selectedPrice = selectedPkg?.sizes
    ? selectedPkg.sizes[form.vehicleSize]
    : selectedPkg?.price;

  // Load blocked slots when date changes
  useEffect(() => {
    if (!form.date || !business?.id) return;
    getConfirmedSlotsForDate(business.id, form.date).then(setBlockedSlots);
  }, [form.date, business?.id]);

  const getTimeConstraints = () => {
    if (!businessHours || !form.date) return {};
    const dh = businessHours[DAYS[new Date(form.date + "T00:00:00").getDay()]];
    if (!dh?.open) return { disabled: true };
    return { min: dh.from, max: dh.to };
  };
  const tc = getTimeConstraints();

  const set = (field) => (e) => {
    let val = e.target.value;
    if (field === "phone" && val && !val.startsWith("+")) val = "+63" + val.replace(/^0/, "");
    setForm((f) => ({ ...f, [field]: val }));
  };

  const validate = () => {
    const e = {};
    if (!form.packageId)                           e.packageId    = "Select a package";
    if (selectedPkg?.sizes && !form.vehicleSize)   e.vehicleSize  = "Select vehicle size";
    if (!form.customerName.trim())                 e.customerName = "Required";
    if (!form.phone.trim())                        e.phone        = "Required";
    else if (!/^\+639\d{9}$/.test(form.phone))     e.phone        = "+639XXXXXXXXX";
    if (!form.date)                                e.date         = "Required";
    if (!form.time)                                e.time         = "Required";
    if (tc.disabled)                               e.time         = "Closed this day";
    if (form.time && blockedSlots.includes(form.time)) e.time = "This time slot is already taken";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      let proofUrl = null;
      const bizId  = business?.id || bizParam || "";
      // Upload payment proof if provided
      if (paymentFile) {
        const tempRef = "SZ-" + Date.now().toString(36).toUpperCase().slice(-6);
        proofUrl = await uploadPaymentProof(bizId, tempRef, paymentFile);
      }
      const ref = await createBooking({
        ...form,
        serviceId:     form.packageId,
        serviceName:   selectedPkg?.name,
        price:         selectedPrice,
        businessId:    bizId,
        plan:          business?.plan || "starter",
        paymentProof:  proofUrl,
        paymentMethod: paymentMethod || null,
      });
      setRefNumber(ref);
      setDone(true);
    } catch (err) {
      if (err.message?.startsWith("PLAN_LIMIT")) setLimitReached(true);
    } finally { setLoading(false); }
  };

  // ── Limit reached ────────────────────────────────────────────
  if (limitReached) return (
    <Box sx={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", bgcolor:"grey.50", p:2 }}>
      <Card sx={{ width:"100%", maxWidth:420, boxShadow:3, textAlign:"center" }}>
        <CardContent sx={{ p:4 }}>
          <Typography fontSize={48} mb={1}>🚫</Typography>
          <Typography fontWeight={800} fontSize={20} mb={1}>Bookings Unavailable</Typography>
          <Typography fontSize={14} color="text.secondary" mb={3}>
            {business?.name} has reached the limit of their current plan.<br />
            Please contact them directly to book.
          </Typography>
          {business?.phone && (
            <Button variant="contained" fullWidth href={`tel:${business.phone}`} sx={{ mb:1.5 }}>
              📞 Call {business.name}
            </Button>
          )}
          {business?.social?.whatsapp && (
            <Button variant="outlined" color="success" fullWidth
              href={`https://wa.me/${business.social.whatsapp.replace(/\D/g,"")}`} target="_blank">
              💬 WhatsApp
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  // ── Success ─────────────────────────────────────────────────────
  if (done) return (
    <Box sx={{ minHeight:"100vh", bgcolor:"grey.50", display:"flex", flexDirection:"column" }}>
      {/* Same top bar */}
      <Box sx={{ bgcolor:"white", borderBottom:"1px solid", borderColor:"divider", px:3, py:1.5 }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          {business?.logoUrl
            ? <Avatar src={business.logoUrl} sx={{ width:36, height:36 }} />
            : <Avatar sx={{ width:36, height:36, bgcolor:"primary.main" }}><LocalCarWashIcon fontSize="small" /></Avatar>
          }
          <Box>
            <Typography fontWeight={700} fontSize={14}>{business?.name || "Sudz Saas Pro"}</Typography>
            <Typography fontSize={11} color="text.secondary">{business?.description || "Premium Carwash"}</Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", p:2 }}>
        <Card sx={{ width:"100%", maxWidth:440, boxShadow:3 }}>
          <CardContent sx={{ p:{ xs:2.5, sm:4 } }}>
            {/* Header */}
            <Stack alignItems="center" mb={3}>
              <Box sx={{ width:64, height:64, borderRadius:"50%", bgcolor:"success.light", display:"flex", alignItems:"center", justifyContent:"center", mb:1.5 }}>
                <CheckCircleIcon sx={{ fontSize:36, color:"success.main" }} />
              </Box>
              <Typography fontWeight={800} fontSize={20}>Booking Confirmed!</Typography>
              <Typography fontSize={13} color="text.secondary" mt={0.5}>Thank you, {form.customerName.split(" ")[0]}!</Typography>
            </Stack>

            {/* Reference number — prominent */}
            <Box sx={{ bgcolor:"#f0f7ff", border:"2px dashed #2563eb", borderRadius:2, p:2, mb:3, textAlign:"center" }}>
              <Typography fontSize={11} fontWeight={700} color="primary.main" letterSpacing={1.5} mb={0.5}>BOOKING REFERENCE</Typography>
              <Typography fontSize={28} fontWeight={900} color="primary.main" letterSpacing={3} sx={{ fontFamily:"monospace" }}>{refNumber}</Typography>
              <Typography fontSize={11} color="text.disabled" mt={0.5}>Show this to the staff upon arrival</Typography>
            </Box>

            {/* Booking summary */}
            <Stack spacing={0} sx={{ bgcolor:"grey.50", borderRadius:2, overflow:"hidden", mb:3 }}>
              {[
                { label:"Service",  value: selectedPkg?.name },
                { label:"Vehicle",  value: form.vehicleSize || "—" },
                { label:"Amount",   value: selectedPrice ? `₱${selectedPrice.toLocaleString()}` : "—" },
                { label:"Date",     value: form.date },
                { label:"Time",     value: form.time },
                { label:"Contact",  value: form.phone },
              ].map(({ label, value }, i, arr) => (
                <Stack key={label} direction="row" justifyContent="space-between" alignItems="center"
                  sx={{ px:2, py:1.2, borderBottom: i < arr.length-1 ? "1px solid" : "none", borderColor:"divider" }}>
                  <Typography fontSize={12} color="text.secondary" fontWeight={500}>{label}</Typography>
                  <Typography fontSize={13} fontWeight={600} sx={{ textAlign:"right", maxWidth:220 }}>{value}</Typography>
                </Stack>
              ))}
            </Stack>

            {/* SMS note */}
            <Box sx={{ bgcolor:"warning.50", border:"1px solid", borderColor:"warning.light", borderRadius:1.5, px:2, py:1.2, mb:3 }}>
              <Typography fontSize={12} color="warning.dark">
                📱 SMS confirmation coming soon — please screenshot this page for your records.
              </Typography>
            </Box>

            {/* Actions */}
            <Stack spacing={1.5}>
              <Button variant="contained" fullWidth size="large"
                onClick={() => { setDone(false); setForm(INIT); setRefNumber(""); }}>
                Book Another Service
              </Button>
              {business?.social?.whatsapp && (
                <Button variant="outlined" fullWidth size="large" color="success"
                  href={`https://wa.me/${business.social.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(`Hi! My booking ref is ${refNumber} — ${selectedPkg?.name} on ${form.date} at ${form.time}`)}`}
                  target="_blank">
                  💬 Message Us on WhatsApp
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  // ── Single screen ────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight:"100vh", bgcolor:"grey.50", display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <Box sx={{ bgcolor:"white", borderBottom:"1px solid", borderColor:"divider", px:3, py:1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            {business?.logoUrl
              ? <Avatar src={business.logoUrl} sx={{ width:40, height:40 }} />
              : <Avatar sx={{ width:40, height:40, bgcolor:"primary.main" }}><LocalCarWashIcon fontSize="small" /></Avatar>
            }
            <Box>
              <Typography fontWeight={700} fontSize={15} lineHeight={1.2}>{business?.name || "Sudz Saas Pro"}</Typography>
              <Typography fontSize={11} color="text.secondary">{business?.description || "Premium Carwash"}</Typography>
            </Box>
          </Stack>
          {/* Social + contact icons */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            {business?.phone && <Tooltip title={business.phone}><IconButton size="small" href={`tel:${business.phone}`}><PhoneIcon sx={{ fontSize:16, color:"text.secondary" }} /></IconButton></Tooltip>}
            {business?.address && <Tooltip title={business.address}><IconButton size="small"><LocationOnIcon sx={{ fontSize:16, color:"text.secondary" }} /></IconButton></Tooltip>}
            {business?.social?.facebook && <IconButton size="small" href={business.social.facebook} target="_blank"><FacebookIcon sx={{ fontSize:16, color:"#1877f2" }} /></IconButton>}
            {business?.social?.instagram && <IconButton size="small" href={business.social.instagram} target="_blank"><InstagramIcon sx={{ fontSize:16, color:"#e1306c" }} /></IconButton>}
            {business?.social?.whatsapp && <IconButton size="small" href={`https://wa.me/${business.social.whatsapp.replace(/\D/g,"")}`} target="_blank"><WhatsAppIcon sx={{ fontSize:16, color:"#25d366" }} /></IconButton>}
            {business?.social?.website && <IconButton size="small" href={business.social.website} target="_blank"><LanguageIcon sx={{ fontSize:16, color:"#2563eb" }} /></IconButton>}
          </Stack>
        </Stack>
      </Box>

      {/* Body */}
      <Box sx={{ flex:1, display:"flex", overflow:"hidden", maxHeight:"calc(100vh - 60px)" }}>

        {/* LEFT — packages */}
        <Box sx={{ width:{ xs:"100%", md:420 }, overflowY:"auto", borderRight:"1px solid", borderColor:"divider", bgcolor:"white", p:2 }}>

          {/* Base inclusions */}
          <Typography fontSize={11} fontWeight={700} color="text.secondary" letterSpacing={0.5} mb={1}>ALL PACKAGES INCLUDE</Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5} mb={2}>
            {BASE.map((b) => (
              <Chip key={b} label={b} size="small" icon={<CheckIcon sx={{ fontSize:"12px !important" }} />}
                variant="outlined" color="primary" sx={{ fontSize:10 }} />
            ))}
          </Stack>
          <Divider sx={{ mb:2 }} />

          {/* DROPDOWN mode */}
          {displayMode === "dropdown" && (
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Package</InputLabel>
                <Select label="Select Package" value={form.packageId}
                  onChange={(e) => setForm((f) => ({ ...f, packageId: e.target.value, vehicleSize: "" }))}>
                  {packages.map((pkg, i) => (
                    <MenuItem key={pkg.id} value={pkg.id}>PKG {i+1} — {pkg.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {form.packageId && (
                <FormControl fullWidth size="small">
                  <InputLabel>Vehicle Size</InputLabel>
                  <Select label="Vehicle Size" value={form.vehicleSize}
                    onChange={(e) => setForm((f) => ({ ...f, vehicleSize: e.target.value }))}>
                    {Object.entries(selectedPkg?.sizes || {}).map(([size, price]) => (
                      <MenuItem key={size} value={size}>{size} — ₱{price.toLocaleString()}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>
          )}

          {/* LIST mode */}
          {displayMode === "list" && (
            <Stack spacing={1}>
              {packages.map((pkg, i) => {
                const isSelected = form.packageId === pkg.id;
                return (
                  <Box key={pkg.id} onClick={() => setForm((f) => ({ ...f, packageId: pkg.id, vehicleSize: "" }))}
                    sx={{ p:1.5, borderRadius:2, border:"1.5px solid", cursor:"pointer",
                      borderColor: isSelected ? "primary.main" : "grey.200",
                      bgcolor: isSelected ? "primary.50" : "white", transition:"all .1s" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={`PKG ${i+1}`} size="small" color={isSelected ? "primary" : "default"} sx={{ fontSize:10, height:18 }} />
                        <Typography fontSize={13} fontWeight={isSelected ? 600 : 400}>{pkg.name}</Typography>
                      </Stack>
                      <Typography fontSize={12} color="primary.main" fontWeight={600}>
                        from ₱{Math.min(...Object.values(pkg.sizes||{})).toLocaleString()}
                      </Typography>
                    </Stack>
                    {isSelected && (
                      <Stack direction="row" flexWrap="wrap" gap={0.8} mt={1}>
                        {Object.entries(pkg.sizes||{}).map(([size, price]) => (
                          <Box key={size} onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, vehicleSize: size })); }}
                            sx={{ px:1, py:0.4, borderRadius:1, border:"1px solid", cursor:"pointer", fontSize:11,
                              borderColor: form.vehicleSize===size ? "primary.main" : "grey.300",
                              bgcolor: form.vehicleSize===size ? "primary.main" : "white",
                              color: form.vehicleSize===size ? "white" : "text.primary" }}>
                            {size} · ₱{price.toLocaleString()}
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}

          {/* CARDS mode (default) */}
          {(displayMode === "cards" || !displayMode) && (
            <Stack spacing={1.5}>
              {packages.map((pkg, i) => {
                const isSelected = form.packageId === pkg.id;
                return (
                  <Card key={pkg.id} onClick={() => setForm((f) => ({ ...f, packageId: pkg.id, vehicleSize: "" }))}
                    sx={{ border:"2px solid", borderColor: isSelected ? "primary.main" : "grey.200",
                      cursor:"pointer", boxShadow: isSelected ? 2 : 0, transition:"all .15s",
                      "&:hover": { borderColor:"primary.light" } }}>
                    <CardContent sx={{ py:"12px !important", px:2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Chip label={`PKG ${i+1}`} size="small" color={isSelected ? "primary" : "default"} sx={{ fontSize:10, height:18, fontWeight:700 }} />
                        {isSelected && <CheckCircleIcon color="primary" sx={{ fontSize:16 }} />}
                      </Stack>
                      <Typography fontWeight={600} fontSize={13} mb={1}>{pkg.name}</Typography>
                      <Stack direction="row" sx={{ flexWrap:"wrap" }} gap={0.5} mb={1}>
                        {(pkg.extra || pkg.inclusions?.filter((x) => !BASE.includes(x)) || []).map((inc) => (
                          <Chip key={inc} label={inc} size="small" color="success" variant="outlined" sx={{ fontSize:10, height:18 }} />
                        ))}
                      </Stack>
                      {/* Size-based pricing */}
                      {pkg.sizes && (
                        <Stack direction="row" sx={{ flexWrap:"wrap" }} gap={1}>
                          {Object.entries(pkg.sizes).map(([size, price]) => (
                            <Box key={size} sx={{ textAlign:"center", minWidth:52,
                              bgcolor: form.vehicleSize===size && isSelected ? "primary.main" : "grey.50",
                              color:   form.vehicleSize===size && isSelected ? "white" : "text.primary",
                              borderRadius:1, px:0.8, py:0.4, cursor:"pointer", border:"1px solid",
                              borderColor: form.vehicleSize===size && isSelected ? "primary.main" : "grey.200",
                              transition:"all .1s" }}
                              onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, packageId: pkg.id, vehicleSize: size })); }}>
                              <Typography fontSize={10} fontWeight={500}>{size}</Typography>
                              <Typography fontSize={11} fontWeight={700}>₱{price.toLocaleString()}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      )}
                      {/* Flat price service */}
                      {!pkg.sizes && pkg.price && (
                        <Chip label={`₱${pkg.price.toLocaleString()}${pkg.duration ? " · " + pkg.duration : ""}`}
                          size="small" color={isSelected ? "primary" : "default"} variant="outlined" sx={{ fontSize:11 }} />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* RIGHT — booking form */}
        <Box sx={{ flex:1, overflowY:"auto", p:3, display:{ xs:"none", md:"block" } }}>
          <Typography fontWeight={700} fontSize={16} mb={2}>Your Booking Details</Typography>

          {/* Selected summary */}
          {form.packageId && (
            <Card sx={{ boxShadow:0, bgcolor:"primary.50", border:"1px solid", borderColor:"primary.light", mb:2 }}>
              <CardContent sx={{ py:"10px !important" }}>
                <Typography fontSize={13} fontWeight={600}>{selectedPkg?.name}</Typography>
                <Stack direction="row" spacing={1} mt={0.5}>
                  {form.vehicleSize && <Chip label={form.vehicleSize} size="small" variant="outlined" />}
                  {selectedPrice   && <Chip label={`₱${selectedPrice.toLocaleString()}`} size="small" color="success" />}
                  {!form.vehicleSize && <Typography fontSize={12} color="warning.main">← Select vehicle size</Typography>}
                </Stack>
              </CardContent>
            </Card>
          )}

          {!form.packageId && (
            <Box sx={{ textAlign:"center", py:4, color:"text.disabled" }}>
              <Typography fontSize={32}>👈</Typography>
              <Typography fontSize={13} mt={1}>Select a package to continue</Typography>
            </Box>
          )}

          {form.packageId && (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <TextField label="Full Name" fullWidth size="small"
                    value={form.customerName} onChange={set("customerName")}
                    error={!!errors.customerName} helperText={errors.customerName} />
                  <TextField label="Phone" fullWidth size="small"
                    value={form.phone} onChange={set("phone")}
                    placeholder="+639XXXXXXXXX" inputProps={{ maxLength:13 }}
                    error={!!errors.phone} helperText={errors.phone || "+63 format"} />
                </Stack>

                <Stack direction="row" spacing={2}>
                  <TextField label="Date" type="date" fullWidth size="small"
                    InputLabelProps={{ shrink:true }} inputProps={{ min:today }}
                    value={form.date} onChange={(e) => { set("date")(e); setForm((f) => ({ ...f, time: "" })); }}
                    error={!!errors.date} helperText={errors.date} />
                </Stack>

                {/* Time slot picker */}
                {form.date && (
                  <Box>
                    <Typography fontSize={13} fontWeight={600} mb={1} color={errors.time ? "error.main" : "text.primary"}>
                      Select Time {tc.disabled ? "— Closed this day" : tc.min ? `(${tc.min}–${tc.max})` : ""}
                    </Typography>
                    {tc.disabled ? (
                      <Alert severity="error" sx={{ fontSize:12 }}>We are closed on this day. Please pick another date.</Alert>
                    ) : (
                      <Stack direction="row" sx={{ flexWrap:"wrap" }} gap={1}>
                        {generateSlots(tc.min, tc.max).map((slot) => {
                          const isBlocked  = blockedSlots.includes(slot);
                          const isSelected = form.time === slot;
                          return (
                            <Box key={slot}
                              onClick={() => !isBlocked && setForm((f) => ({ ...f, time: slot }))}
                              sx={{
                                px:1.5, py:0.6, borderRadius:1.5, fontSize:12, fontWeight:500,
                                border:"1.5px solid", cursor: isBlocked ? "not-allowed" : "pointer",
                                bgcolor: isBlocked ? "grey.100" : isSelected ? "primary.main" : "white",
                                color:   isBlocked ? "text.disabled" : isSelected ? "white" : "text.primary",
                                borderColor: isBlocked ? "grey.200" : isSelected ? "primary.main" : "grey.300",
                                textDecoration: isBlocked ? "line-through" : "none",
                                transition:"all .1s",
                                "&:hover": !isBlocked ? { borderColor:"primary.main", bgcolor: isSelected ? "primary.dark" : "primary.50" } : {},
                              }}>
                              {slot}
                              {isBlocked && <Typography component="span" fontSize={9} ml={0.5} color="error.light">taken</Typography>}
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                    {errors.time && !tc.disabled && <Typography fontSize={11} color="error.main" mt={0.5}>{errors.time}</Typography>}
                  </Box>
                )}

                <TextField label="Notes (optional)" multiline rows={2} fullWidth size="small"
                  value={form.notes} onChange={set("notes")} placeholder="Any special requests..." />

                {/* Payment section */}
                {(business?.payment?.gcash || business?.payment?.maya || business?.payment?.gotym || business?.payment?.bank) && (
                  <Box sx={{ bgcolor:"grey.50", borderRadius:2, p:2 }}>
                    <Typography fontSize={13} fontWeight={600} mb={1.5}>💳 Pay in Advance (Optional but Recommended)</Typography>
                    <Typography fontSize={12} color="text.secondary" mb={1.5}>
                      Upload your payment screenshot to get priority confirmation. Unpaid bookings are pending until the owner confirms.
                    </Typography>

                    {/* Payment method selector */}
                    <Stack direction="row" sx={{ flexWrap:"wrap" }} gap={1} mb={1.5}>
                      {business?.payment?.gcash && (
                        <Chip label={`GCash: ${business.payment.gcash}`} size="small"
                          color={paymentMethod==="gcash" ? "primary" : "default"} variant={paymentMethod==="gcash" ? "filled" : "outlined"}
                          onClick={() => setPaymentMethod(paymentMethod==="gcash" ? "" : "gcash")} sx={{ cursor:"pointer", fontSize:11 }} />
                      )}
                      {business?.payment?.maya && (
                        <Chip label={`Maya: ${business.payment.maya}`} size="small"
                          color={paymentMethod==="maya" ? "success" : "default"} variant={paymentMethod==="maya" ? "filled" : "outlined"}
                          onClick={() => setPaymentMethod(paymentMethod==="maya" ? "" : "maya")} sx={{ cursor:"pointer", fontSize:11 }} />
                      )}
                      {business?.payment?.gotym && (
                        <Chip label={`GotYm: ${business.payment.gotym}`} size="small"
                          color={paymentMethod==="gotym" ? "warning" : "default"} variant={paymentMethod==="gotym" ? "filled" : "outlined"}
                          onClick={() => setPaymentMethod(paymentMethod==="gotym" ? "" : "gotym")} sx={{ cursor:"pointer", fontSize:11 }} />
                      )}
                      {business?.payment?.bank && (
                        <Chip label={`Bank: ${business.payment.bank}`} size="small"
                          color={paymentMethod==="bank" ? "secondary" : "default"} variant={paymentMethod==="bank" ? "filled" : "outlined"}
                          onClick={() => setPaymentMethod(paymentMethod==="bank" ? "" : "bank")} sx={{ cursor:"pointer", fontSize:11 }} />
                      )}
                    </Stack>

                    {/* Show QR code if available for selected method */}
                    {paymentMethod && business?.payment?.[`${paymentMethod}Qr`] && (
                      <Box sx={{ textAlign:"center", mb:1.5 }}>
                        <Typography fontSize={12} color="text.secondary" mb={1}>
                          Scan to pay via {paymentMethod.charAt(0).toUpperCase()+paymentMethod.slice(1)}
                        </Typography>
                        <Box component="img" src={business.payment[`${paymentMethod}Qr`]}
                          sx={{ width:160, height:160, objectFit:"contain", border:"1px solid", borderColor:"divider", borderRadius:2 }} />
                        <Typography fontSize={11} color="text.secondary" mt={0.5}>
                          {business.payment[paymentMethod]}
                        </Typography>
                      </Box>
                    )}

                    {/* Upload proof */}
                    <input ref={paymentRef} type="file" accept="image/*" hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setPaymentFile(f);
                        setPaymentPreview(URL.createObjectURL(f));
                      }} />
                    {paymentPreview ? (
                      <Stack spacing={1}>
                        <Box component="img" src={paymentPreview}
                          sx={{ width:"100%", maxHeight:180, objectFit:"contain", borderRadius:2, border:"1px solid", borderColor:"divider" }} />
                        <Button size="small" variant="outlined" color="error"
                          onClick={() => { setPaymentFile(null); setPaymentPreview(""); }}>
                          Remove
                        </Button>
                      </Stack>
                    ) : (
                      <Button size="small" variant="outlined" fullWidth
                        onClick={() => paymentRef.current.click()}>
                        📷 Upload Payment Screenshot
                      </Button>
                    )}
                  </Box>
                )}

                {/* Blocked slots warning */}
                {blockedSlots.length > 0 && form.date && (
                  <Alert severity="info" sx={{ fontSize:12 }}>
                    Already confirmed on {form.date}: {blockedSlots.join(", ")}. Please choose a different time.
                  </Alert>
                )}

                <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || (selectedPkg?.sizes && !form.vehicleSize)}>
                  {loading ? "Submitting..." : selectedPrice ? `Book Now · ₱${selectedPrice.toLocaleString()}` : "Book Now"}
                </Button>
              </Stack>
            </Box>
          )}

          <Stack direction="row" justifyContent="center" alignItems="center" mt={3} spacing={0.5}>
            <LoginIcon sx={{ fontSize:13, color:"text.disabled" }} />
            <Link component="button" variant="body2" color="text.disabled" underline="hover" fontSize={11}
              onClick={() => navigate("/login")}>Owner login</Link>
          </Stack>
        </Box>
      </Box>

      {/* Mobile: sticky bottom form trigger */}
      <Box sx={{ display:{ xs:"block", md:"none" }, position:"sticky", bottom:0, bgcolor:"white",
        borderTop:"1px solid", borderColor:"divider", p:2 }}>
        {form.packageId && form.vehicleSize && form.time ? (
          <Button variant="contained" fullWidth size="large" onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : `Book Now · ₱${selectedPrice?.toLocaleString()}`}
          </Button>
        ) : (
          <Typography fontSize={13} color="text.secondary" textAlign="center">
            {!form.packageId ? "Select a package" : !form.vehicleSize ? "Select vehicle size" : "Select a time slot"}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
