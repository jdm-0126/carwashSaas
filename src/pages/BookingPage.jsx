import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createBooking, getConfirmedSlotsForDate, uploadPaymentProof } from "../services/bookingService";
import { getBusinessBySlug, getBusiness } from "../services/businessService";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  Box, Typography, Card, CardContent, Avatar, TextField,
  Button, Stack, Link, Chip, Divider, Alert, Dialog, DialogContent,
  Tooltip, IconButton,
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
import BookingChatWidget from "../components/ChatBox";

const checkIcon = <CheckIcon sx={{ fontSize: "12px !important" }} />;
const InclusionChip = ({ label }) => (
  <Chip label={label} size="small" icon={checkIcon} variant="outlined" color="primary" sx={{ fontSize: 10 }} />
);

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
const SIZES = ["Sub-Compact","Small","Medium","Large","X-Large"];
const today = new Date().toISOString().split("T")[0];
const INIT  = { customerName:"", phone:"", packageId:"", vehicleSize:"", date:"", time:"", notes:"" };

// Helper to sort vehicle sizes in correct order
const sortSizes = (sizesObj) => {
  if (!sizesObj) return [];
  return Object.entries(sizesObj).sort((a, b) => {
    const indexA = SIZES.indexOf(a[0]);
    const indexB = SIZES.indexOf(b[0]);                                
    return indexA - indexB;
  });
};

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
  const [packages, setPackages] = useState([]);
  const [baseInclusions, setBaseInclusions] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [paymentFile, setPaymentFile]   = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentPreview, setPaymentPreview] = useState("");
  const paymentRef = useRef();

  const [step, setStep] = useState("packages"); // mobile step: "packages" | "form"

  const { business: ownerBusiness } = useAuth();

  useEffect(() => {
    const load = async () => {
      let data = null;
      if (bizParam)              data = await getBusiness(bizParam);
      else if (slug)             data = await getBusinessBySlug(slug);
      else if (ownerBusiness)    data = ownerBusiness; // owner previewing their own booking page
      if (!data) return;
      setBusiness(data);
      if (data.businessHours)   setBusinessHours(data.businessHours);
      if (data.baseInclusions)   setBaseInclusions(data.baseInclusions);
      const snap = await getDocs(query(collection(db, "services"), where("businessId", "==", data.id)));
      if (!snap.empty) {
        const sorted = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            // Sort by createdAt timestamp (oldest first)
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return aTime - bTime;
          });
        setPackages(sorted);
      }
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

  // Expose form update function for chat widget
  useEffect(() => {
    window.updateBookingForm = (chatData) => {
      console.log("Chat data received:", chatData);
      
      // Find package by name (more flexible matching)
      const pkg = packages.find(p => {
        const pkgName = p.name.toLowerCase();
        const chatPkg = (chatData.package || "").toLowerCase();
        return pkgName.includes(chatPkg) || chatPkg.includes(pkgName.split(" ")[0]);
      });
      
      console.log("Found package:", pkg);
      
      // Normalize phone
      let phone = chatData.phone || "";
      if (phone) {
        phone = phone.replace(/\s/g, "");
        if (phone.startsWith("0")) {
          phone = "+63" + phone.slice(1);
        } else if (!phone.startsWith("+")) {
          phone = "+63" + phone;
        }
      }
      
      // Parse date from chat (handle various formats)
      let formattedDate = "";
      if (chatData.date) {
        const dateStr = chatData.date.toLowerCase();
        const today = new Date();
        
        if (dateStr.includes("tomorrow")) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          formattedDate = tomorrow.toISOString().split("T")[0];
        } else {
          // Try to parse the date
          const parsed = new Date(chatData.date);
          if (!isNaN(parsed.getTime())) {
            formattedDate = parsed.toISOString().split("T")[0];
          }
        }
      }
      
      // Parse time from chat (convert to 24-hour format)
      let formattedTime = "";
      if (chatData.time) {
        const timeStr = chatData.time.toLowerCase();
        const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
        
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] || "00";
          const period = timeMatch[3];
          
          if (period === "pm" && hours !== 12) hours += 12;
          if (period === "am" && hours === 12) hours = 0;
          
          formattedTime = `${String(hours).padStart(2, "0")}:${minutes}`;
        }
      }
      
      setForm(prev => ({
        ...prev,
        ...(pkg && { packageId: pkg.id }),
        ...(chatData.vehicleSize && { vehicleSize: chatData.vehicleSize }),
        ...(chatData.name && { customerName: chatData.name }),
        ...(phone && { phone }),
        ...(formattedDate && { date: formattedDate }),
        ...(formattedTime && { time: formattedTime }),
      }));
      
      // Auto-navigate to form step on mobile
      setStep("form");
    };
    
    // Expose submit function for chat
    window.submitBookingForm = async () => {
      const errs = validate();
      if (Object.keys(errs).length === 0) {
        setLoading(true);
        try {
          let proofUrl = null;
          const bizId  = business?.id || bizParam || "";
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
          else setErrors((prev) => ({ ...prev, submit: "Something went wrong. Please try again." }));
        } finally { 
          setLoading(false); 
        }
      } else {
        console.error("Validation errors:", errs);
        setErrors(errs);
      }
    };
    
    return () => {
      delete window.updateBookingForm;
      delete window.submitBookingForm;
    };
  }, [packages, form, business]);

  const getTimeConstraints = () => {
    if (!form.date) return {};
    if (!businessHours) return { min: "08:00", max: "18:00" };
    const dh = businessHours[DAYS[new Date(form.date + "T00:00:00").getDay()]];
    if (!dh || !dh.open) return { disabled: true };
    return { min: dh.from, max: dh.to };
  };
  const tc = getTimeConstraints();

  const set = (field) => (e) => {
    let val = e.target.value;
    if (field === "phone") {
      const digits = val.replace(/\D/g, "");
      const capped = digits.startsWith("63") ? digits.slice(0, 12) : ("63" + digits.replace(/^0/, "")).slice(0, 12);
      val = "+" + capped;
      if (val === "+") val = "";
    }
    if (field === "customerName") val = val.replace(/[^a-zA-Z\s.'-]/g, "");
    setForm((f) => ({ ...f, [field]: val }));
  };

  const validate = () => {
    const e = {};
    if (!form.packageId)                           e.packageId    = "Select a package";
    if (selectedPkg?.sizes && !form.vehicleSize)   e.vehicleSize  = "Select vehicle size";
    if (!form.customerName.trim())                 e.customerName = "Required";
    if (!form.phone.trim())                        e.phone        = "Required";
    else if (form.phone.replace(/\D/g,"").length < 11) e.phone   = "+639XXXXXXXXX";
    if (!form.date)                                e.date         = "Required";
    if (!form.time)                                e.time         = "Required";
    if (tc.disabled)                               e.time         = "Closed this day";
    if (form.time && blockedSlots.includes(form.time)) e.time = "This time slot is already taken";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); window.scrollTo(0,0); return; }
    setErrors({});
    setLoading(true);
    try {
      let proofUrl = null;
      const bizId  = business?.id || bizParam || "";
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
      else setErrors((prev) => ({ ...prev, submit: "Something went wrong. Please try again." }));
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

  const handleConfirmClose = () => {
    setDone(false);
    setForm(INIT);
    setRefNumber("");
    setPaymentFile(null);
    setPaymentPreview("");
    setPaymentMethod("");
    setStep("packages");
  };

  // ── Single screen ────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight:"100vh", bgcolor:"grey.50", display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <Box sx={{ bgcolor:"white", borderBottom:"1px solid", borderColor:"divider", px:2, py:1.5 }}>
        <Stack direction="row" alignItems="center" width="100%">
        <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
          <Stack direction="row" alignItems="center" gap={1.5}>
            {/* Back button — mobile form step only */}
            {step === "form" && (
              <IconButton size="small" onClick={() => setStep("packages")} sx={{ display:{ md:"none" }, mr:0.5 }}>
                <Typography fontSize={18}>←</Typography>
              </IconButton>
            )}
            {business?.logoUrl
              ? <Avatar src={business.logoUrl} sx={{ width:40, height:40 }} />
              : <Avatar sx={{ width:40, height:40, bgcolor:"primary.main" }}><LocalCarWashIcon fontSize="small" /></Avatar>
            }
            <Box>
              <Typography fontWeight={700} fontSize={15} lineHeight={1.2}>{business?.name || "Sudz Saas Pro"}</Typography>
              <Typography fontSize={11} color="text.secondary">{business?.description || "Premium Carwash"}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {business?.phone && <Tooltip title={business.phone}><IconButton size="small" href={`tel:${business.phone}`}><PhoneIcon sx={{ fontSize:16, color:"text.secondary" }} /></IconButton></Tooltip>}
            {business?.address && <Tooltip title={business.address}><IconButton size="small"><LocationOnIcon sx={{ fontSize:16, color:"text.secondary" }} /></IconButton></Tooltip>}
            {business?.social?.facebook && <IconButton size="small" href={business.social.facebook} target="_blank"><FacebookIcon sx={{ fontSize:16, color:"#1877f2" }} /></IconButton>}
            {business?.social?.instagram && <IconButton size="small" href={business.social.instagram} target="_blank"><InstagramIcon sx={{ fontSize:16, color:"#e1306c" }} /></IconButton>}
            {business?.social?.whatsapp && <IconButton size="small" href={`https://wa.me/${business.social.whatsapp.replace(/\D/g,"")}`} target="_blank"><WhatsAppIcon sx={{ fontSize:16, color:"#25d366" }} /></IconButton>}
            {business?.social?.website && <IconButton size="small" href={business.social.website} target="_blank"><LanguageIcon sx={{ fontSize:16, color:"#2563eb" }} /></IconButton>}
            {/* Next button — mobile packages step only, pinned to far right */}
            {step === "packages" && form.packageId && (
              <Button size="small" variant="contained" onClick={() => setStep("form")}
                sx={{ display:{ md:"none" }, fontSize:12, px:2, py:0.6, ml:1 }}>
                Next →
              </Button>
            )}
          </Stack>
        </Stack>
        </Stack>
      </Box>

      {/* Body */}
      <Box sx={{ flex:1, display:"flex", flexDirection:{ xs:"column", md:"row" }, overflow:"hidden", height:{ md:"calc(100vh - 61px)" } }}>

        {/* LEFT — packages (hidden on mobile when on form step) */}
        <Box sx={{
          width:{ xs:"100%", md:420 }, flexShrink:0,
          display:{ xs: step==="packages" ? "flex" : "none", md:"flex" },
          flexDirection:"column",
          overflowY:"auto", overflowX:"hidden",
          borderRight:{ md:"1px solid" }, borderColor:"divider",
          bgcolor:"white", p:2,
          height:{ xs:"calc(100vh - 61px)", md:"auto" },
        }}>

          {/* Base inclusions */}
          {baseInclusions.length > 0 && (
            <>
              <Typography fontSize={11} fontWeight={700} color="text.secondary" letterSpacing={0.5} mb={1}>ALL PACKAGES INCLUDE</Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5} mb={2}>
                {baseInclusions.map((b) => <InclusionChip key={b} label={b} />)}
              </Stack>
              <Divider sx={{ mb:2 }} />
            </>
          )}

          {/* Package cards */}
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
                      {(pkg.extra || pkg.inclusions?.filter((x) => !baseInclusions.includes(x)) || []).map((inc) => (
                        <Chip key={inc} label={inc} size="small" color="success" variant="outlined" sx={{ fontSize:10, height:18 }} />
                      ))}
                    </Stack>
                    {/* Size-based pricing */}
                    {pkg.sizes && (
                      <Stack direction="row" sx={{ flexWrap:"wrap" }} gap={1}>
                        {sortSizes(pkg.sizes).map(([size, price]) => (
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
        </Box>

        {/* RIGHT — booking form (hidden on mobile when on packages step) */}
        <Box 
          data-form-section="true"
          sx={{
          flex:1,
          display:{ xs: step==="form" ? "flex" : "none", md:"flex" },
          flexDirection:"column",
          overflowY:"auto", p:{ xs:2, md:3 },
          height:{ xs:"calc(100vh - 61px)", md:"auto" },
        }}>
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
              <Typography fontSize={32} sx={{ display:{ xs:"none", md:"block" } }}>👈</Typography>
              <Typography fontSize={32} sx={{ display:{ xs:"block", md:"none" } }}>👆</Typography>
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
                    value={form.phone}
                    onChange={set("phone")}
                    type="tel"
                    inputProps={{ maxLength:13, inputMode:"numeric" }}
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
                      <Stack direction="row" sx={{ flexWrap:"wrap" }} gap={{ xs: 0.8, sm: 1 }}>
                        {generateSlots(tc.min, tc.max).map((slot) => {
                          const isBlocked  = blockedSlots.includes(slot);
                          const isSelected = form.time === slot;
                          return (
                            <Box key={slot}
                              onClick={() => !isBlocked && setForm((f) => ({ ...f, time: slot }))}
                              sx={{
                                px:{ xs: 1.2, sm: 1.5 }, 
                                py:{ xs: 0.5, sm: 0.6 }, 
                                borderRadius:1.5, 
                                fontSize:{ xs: 11, sm: 12 }, 
                                fontWeight:500,
                                border:"1.5px solid", 
                                cursor: isBlocked ? "not-allowed" : "pointer",
                                bgcolor: isBlocked ? "grey.100" : isSelected ? "primary.main" : "white",
                                color:   isBlocked ? "text.disabled" : isSelected ? "white" : "text.primary",
                                borderColor: isBlocked ? "grey.200" : isSelected ? "primary.main" : "grey.300",
                                textDecoration: isBlocked ? "line-through" : "none",
                                transition:"all .1s",
                                minWidth: { xs: 60, sm: 70 },
                                textAlign: "center",
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

                {errors.submit && (
                  <Alert severity="error" sx={{ fontSize:12 }}>{errors.submit}</Alert>
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

      {/* Confirmation Dialog */}
      <Dialog open={done} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p:{ xs:3, sm:4 } }}>
          {/* Header */}
          <Stack alignItems="center" mb={3}>
            <Box sx={{ width:60, height:60, borderRadius:"50%", bgcolor:"success.light", display:"flex", alignItems:"center", justifyContent:"center", mb:1.5 }}>
              <CheckCircleIcon sx={{ fontSize:34, color:"success.main" }} />
            </Box>
            <Typography fontWeight={800} fontSize={20}>Booking Confirmed!</Typography>
            <Typography fontSize={13} color="text.secondary" mt={0.5}>Thank you, {form.customerName.split(" ")[0]}!</Typography>
          </Stack>

          {/* Reference number */}
          <Box sx={{ bgcolor:"#f0f7ff", border:"2px dashed #2563eb", borderRadius:2, p:2, mb:3, textAlign:"center" }}>
            <Typography fontSize={11} fontWeight={700} color="primary.main" letterSpacing={1.5} mb={0.5}>BOOKING REFERENCE</Typography>
            <Typography fontSize={28} fontWeight={900} color="primary.main" letterSpacing={4} sx={{ fontFamily:"monospace" }}>{refNumber}</Typography>
            <Typography fontSize={11} color="text.disabled" mt={0.5}>Show this to the staff upon arrival</Typography>
          </Box>

          {/* Booking summary */}
          <Box sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, overflow:"hidden", mb:3 }}>
            {[
              { label:"Service", value: selectedPkg?.name },
              { label:"Vehicle", value: form.vehicleSize || "—" },
              { label:"Amount",  value: selectedPrice ? `₱${selectedPrice.toLocaleString()}` : "—" },
              { label:"Date",    value: form.date },
              { label:"Time",    value: form.time },
            ].map(({ label, value }, i, arr) => (
              <Stack key={label} direction="row" justifyContent="space-between" alignItems="center"
                sx={{ px:2, py:1.5, bgcolor: i % 2 === 0 ? "grey.50" : "white",
                  borderBottom: i < arr.length - 1 ? "1px solid" : "none", borderColor:"divider" }}>
                <Typography fontSize={13} color="text.secondary" fontWeight={500}>{label}</Typography>
                <Typography fontSize={13} fontWeight={700} sx={{ textAlign:"right", maxWidth:200 }}>{value}</Typography>
              </Stack>
            ))}
          </Box>

          {/* Actions */}
          <Stack spacing={1.5}>
            <Button variant="contained" fullWidth size="large" onClick={handleConfirmClose}>
              OK — Book Another
            </Button>
            {business?.social?.whatsapp && (
              <Button variant="outlined" fullWidth color="success"
                href={`https://wa.me/${business.social.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(`Hi! My booking ref is ${refNumber} — ${selectedPkg?.name} on ${form.date} at ${form.time}`)}`}
                target="_blank">
                💬 Message on WhatsApp
              </Button>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Chat Widget - Available for all plans, but free tier limited to 10 bookings */}
      {business && (
        business.plan === "pro" || 
        business.plan === "enterprise" || 
        (business.plan === "starter" && (business.bookingCount || 0) < 10)
      ) && <BookingChatWidget />}

    </Box>
  );
}
