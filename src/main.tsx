import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Root } from "@/components/pages/Root.tsx";
import { applyGlobalStyles } from "@/theme";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

applyGlobalStyles();

createRoot(root).render(
	<StrictMode>
		<Root />
	</StrictMode>,
);
