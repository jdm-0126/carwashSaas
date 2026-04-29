import * as React from "react";
import { ChatBox } from "@mui/x-chat";
import { Box, Fab, Zoom, Paper, IconButton, Typography } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import { createBookingAdapter, INITIAL_MESSAGES } from "../utils/chatAdapter";

export default function BookingChatWidget() {
  const [open, setOpen] = React.useState(false);
  const adapter = React.useMemo(() => createBookingAdapter(), []);

  return (
    <>
      {/* Chat panel — full screen on mobile, large panel on desktop */}
      <Zoom in={open} unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            zIndex: 1400,
            borderRadius: { xs: 0, sm: 3 },
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            // Mobile: full screen
            top:    { xs: 0,    sm: "auto" },
            left:   { xs: 0,    sm: "auto" },
            right:  { xs: 0,    sm: 24 },
            bottom: { xs: 0,    sm: 88 },
            width:  { xs: "100%", sm: 420, md: 480 },
            height: { xs: "100%", sm: "70vh", md: "75vh" },
            maxHeight: { sm: 680 },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ChatIcon fontSize="small" />
              <Typography fontWeight={700} fontSize={15}>
                Booking Assistant
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{ color: "primary.contrastText" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Chat surface fills remaining height - thread-only mode (no sidebar) */}
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <ChatBox
              adapter={adapter}
              variant="compact"
              density="comfortable"
              initialMessages={INITIAL_MESSAGES}
              sx={{ height: "100%", border: "none", borderRadius: 0 }}
            />
          </Box>
        </Paper>
      </Zoom>

      {/* FAB — hidden when panel is open on mobile (close button handles it) */}
      <Fab
        color="primary"
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1400,
          boxShadow: 6,
          display: { xs: open ? "none" : "flex", sm: "flex" },
        }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </Fab>
    </>
  );
}
