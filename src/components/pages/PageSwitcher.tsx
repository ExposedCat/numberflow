import { Check, ChevronDown, File, Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { styled } from "@/theme";
import {
	ControlPanel,
	PanelButton,
	PanelIconButton,
	TextInput,
} from "../ui/Controls";

type PageSwitcherProps = {
	pages: { id: string; name: string }[];
	activePageId: string;
	onSelect: (id: string) => void;
	onCreate: (name: string) => void;
	onDelete: (id: string) => void;
};

const Container = styled(ControlPanel, {
	display: "block",
	position: "relative",
	fontSize: "$small",
});

const Trigger = styled(PanelButton, {
	maxWidth: "min(240px, calc(100vw - 194px))",
	"@media (max-width: 600px)": {
		"& > svg:first-child": { display: "none" },
	},
});

const PageName = styled("span", {
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});

const Dropdown = styled(ControlPanel, {
	position: "absolute",
	display: "block",
	zIndex: 10,
	top: "calc(100% + 10px)",
	left: 0,
	width: "min(320px, calc(100vw - 32px))",
});

const PageButton = styled(PanelButton, {
	justifyContent: "flex-start",
	minWidth: 0,
	textAlign: "left",
});

const actionRowStyles = {
	display: "grid",
	gridTemplateColumns: "minmax(0, 1fr) max-content",
	alignItems: "center",
	gap: "$xs",
} as const;

const PageRow = styled("div", {
	...actionRowStyles,
	marginBottom: "$xs",
});

const CreateForm = styled("form", {
	...actionRowStyles,
	marginTop: "$xs",
});

const PageNameInput = styled(TextInput, {
	defaultVariants: { context: "panel" },
});

export function PageSwitcher({
	pages,
	activePageId,
	onSelect,
	onCreate,
	onDelete,
}: PageSwitcherProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const dropdownId = useId();
	const activePage = pages.find((page) => page.id === activePageId);

	useEffect(() => {
		if (!open) return;
		const closeOutside = (event: PointerEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", closeOutside);
		return () => document.removeEventListener("pointerdown", closeOutside);
	}, [open]);

	return (
		<Container
			ref={containerRef}
			onKeyDown={(event) => {
				if (event.key === "Escape" && open) {
					event.stopPropagation();
					setOpen(false);
					triggerRef.current?.focus();
				}
			}}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
			}}
		>
			<Trigger
				ref={triggerRef}
				type="button"
				aria-expanded={open}
				aria-controls={dropdownId}
				aria-label={`Pages: ${activePage?.name}`}
				onClick={() => setOpen((previous) => !previous)}
			>
				<File aria-hidden="true" size={16} />
				<PageName>{activePage?.name}</PageName>
				<ChevronDown aria-hidden="true" size={16} />
			</Trigger>
			{open && (
				<Dropdown id={dropdownId}>
					<nav
						aria-label="Pages"
						style={{ maxHeight: "40vh", overflowY: "auto" }}
					>
						{pages.map((page) => (
							<PageRow key={page.id}>
								<PageButton
									type="button"
									aria-current={page.id === activePageId ? "page" : undefined}
									onClick={() => {
										onSelect(page.id);
										setOpen(false);
										triggerRef.current?.focus();
									}}
								>
									<File aria-hidden="true" size={16} />
									<PageName css={{ flex: 1 }}>{page.name}</PageName>
									{page.id === activePageId && (
										<Check aria-hidden="true" size={16} />
									)}
								</PageButton>
								<PanelIconButton
									type="button"
									aria-label={`Delete ${page.name}`}
									title={
										pages.length === 1
											? "Keep at least one page"
											: `Delete ${page.name}`
									}
									disabled={pages.length === 1}
									appearance="danger"
									onClick={() => {
										onDelete(page.id);
										triggerRef.current?.focus();
									}}
								>
									<Trash2 aria-hidden="true" size={16} />
								</PanelIconButton>
							</PageRow>
						))}
					</nav>
					<CreateForm
						onSubmit={(event) => {
							event.preventDefault();
							onCreate(name.trim());
							setName("");
							setOpen(false);
							triggerRef.current?.focus();
						}}
					>
						<PageNameInput
							aria-label="Page name"
							placeholder="Page name"
							value={name}
							maxLength={80}
							onChange={(event) => setName(event.currentTarget.value)}
						/>
						<PanelIconButton
							type="submit"
							aria-label="Create page"
							title="Create page"
						>
							<Plus aria-hidden="true" size={16} />
						</PanelIconButton>
					</CreateForm>
				</Dropdown>
			)}
		</Container>
	);
}
