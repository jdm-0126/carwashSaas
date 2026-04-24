import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, Divider, Avatar, IconButton, Tooltip,
  useMediaQuery, useTheme,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import BookOnlineIcon from "@mui/icons-material/BookOnline";
import SettingsIcon from "@mui/icons-material/Settings";
import LocalCarWashIcon from "@mui/icons-material/LocalCarWash";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AssessmentIcon from "@mui/icons-material/Assessment";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";

const DRAWER_OPEN   = 240;
const DRAWER_CLOSED = 64;

// Owner nav — no Dashboard (that's superadmin only)
const NAV_ITEMS = [
  { label: "Bookings",  icon: <CalendarMonthIcon />, path: "/" },
  { label: "Book Now",  icon: <BookOnlineIcon />,    path: "/book" },
  { label: "Reports",   icon: <AssessmentIcon />,    path: "/reports" },
];

const BOTTOM_ITEMS = [
  { label: "Settings", icon: <SettingsIcon />, path: "/settings" },
];

function NavList({ items, open, onNavigate }) {
  const navigate   = useNavigate();
  const { pathname } = useLocation();

  return (
    <List dense>
      {items.map(({ label, icon, path }) => {
        const active = pathname === path;
        return (
          <ListItem key={path} disablePadding sx={{ px: 1, mb: 0.5 }}>
            <Tooltip title={!open ? label : ""} placement="right">
              <ListItemButton
                onClick={() => { navigate(path); onNavigate?.(); }}
                selected={active}
                sx={{
                  borderRadius: 2,
                  justifyContent: open ? "initial" : "center",
                  px: open ? 1.5 : 1,
                  "&.Mui-selected": {
                    bgcolor: "primary.main", color: "white",
                    "& .MuiListItemIcon-root": { color: "white" },
                    "&:hover": { bgcolor: "primary.dark" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: open ? 1.5 : 0, justifyContent: "center", color: active ? "white" : "text.secondary" }}>
                  {icon}
                </ListItemIcon>
                {open && <ListItemText primary={label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        );
      })}
    </List>
  );
}

function SidebarContent({ open, onToggle, onNavigate }) {
  const { business, logout } = useAuth();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Brand */}
      <Box sx={{ px: open ? 2 : 1, py: 1.5, display: "flex", alignItems: "center", justifyContent: open ? "space-between" : "center", minHeight: 56 }}>
        {open && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              src={business?.logoUrl || ""}
              sx={{ bgcolor: "primary.main", width: 32, height: 32 }}
            >
              {!business?.logoUrl && <LocalCarWashIcon fontSize="small" />}
            </Avatar>
            <Box>
              <Typography fontWeight={700} fontSize={13} lineHeight={1.2}>{business?.name || "Sudz Saas Pro"}</Typography>
              <Typography fontSize={10} color="text.secondary" noWrap sx={{ maxWidth: 130 }}>{business?.description || "Owner"}</Typography>
            </Box>
          </Box>
        )}
        {onToggle && (
          <IconButton size="small" onClick={onToggle}>
            {open ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>

      <Divider />

      <Box sx={{ flex: 1, pt: 1 }}>
        <NavList items={NAV_ITEMS} open={open} onNavigate={onNavigate} />
      </Box>

      <Divider />

      <Box sx={{ pb: 1 }}>
        <NavList items={BOTTOM_ITEMS} open={open} onNavigate={onNavigate} />
        {open && (
          <ListItem disablePadding sx={{ px: 1, mt: 0.5 }}>
            <ListItemButton onClick={logout} sx={{ borderRadius: 2, px: 1.5 }}>
              <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: "error.main" }}><LogoutIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: 13, color: "error.main" }} />
            </ListItemButton>
          </ListItem>
        )}
      </Box>
    </Box>
  );
}

export default function Sidebar({ children }) {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen]           = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const width = open ? DRAWER_OPEN : DRAWER_CLOSED;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>

      {/* Mobile top bar */}
      {isMobile && (
        <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, bgcolor: "white", borderBottom: "1px solid", borderColor: "divider", px: 2, height: 56, display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton size="small" onClick={() => setMobileOpen(true)}><MenuIcon /></IconButton>
          <Typography fontWeight={700} fontSize={15}>Sudz Saas Pro</Typography>
        </Box>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
          <Box sx={{ width: DRAWER_OPEN }}>
            <SidebarContent open={true} onNavigate={() => setMobileOpen(false)} />
          </Box>
        </Drawer>
      )}

      {/* Desktop permanent drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width, flexShrink: 0, transition: "width .2s",
            "& .MuiDrawer-paper": {
              width, boxSizing: "border-box", borderRight: "1px solid",
              borderColor: "divider", overflowX: "hidden", transition: "width .2s",
            },
          }}
        >
          <SidebarContent open={open} onToggle={() => setOpen((v) => !v)} />
        </Drawer>
      )}

      {/* Main content */}
      <Box component="main" sx={{ flex: 1, bgcolor: "grey.50", minHeight: "100vh", mt: isMobile ? "56px" : 0, transition: "margin .2s" }}>
        {children}
      </Box>
    </Box>
  );
}
