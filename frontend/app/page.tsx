import { Box, List, ListItem, ListItemText } from "@mui/material";
import Link from "next/link";

export default function Home() {
  return (
    <Box sx={{ p: 2 }}>
      <List>
        <ListItem
          component={Link}
          href="/admin"
          sx={{ textDecoration: "none", color: "inherit" }}
        >
          <ListItemText primary="Admin" />
        </ListItem>
        <ListItem
          component={Link}
          href="/explore"
          sx={{ textDecoration: "none", color: "inherit" }}
        >
          <ListItemText primary="Explore" />
        </ListItem>
      </List>
    </Box>
  );
}
