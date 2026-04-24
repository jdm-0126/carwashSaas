import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, Stack,
} from "@mui/material";
import LocalCarWashIcon from "@mui/icons-material/LocalCarWash";

export default function LoginPage() {
  const { loginAsOwner } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginAsOwner(email, password);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50" }}>
      <Card sx={{ width: 380, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" mb={3}>
            <Box sx={{ bgcolor: "primary.main", borderRadius: 2, p: 1.2, mb: 1.5 }}>
              <LocalCarWashIcon sx={{ color: "white", fontSize: 28 }} />
            </Box>
            <Typography fontWeight={700} fontSize={20}>Sudz Saas Pro</Typography>
            <Typography fontSize={13} color="text.secondary">Owner Login</Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField label="Email" type="email" fullWidth size="small"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
              <TextField label="Password" type="password" fullWidth size="small"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
