import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	Background,
	BackgroundVariant,
	type Connection,
	type EdgeChange,
	type NodeChange,
	Panel,
	ReactFlow,
	type ReactFlowInstance,
	type SnapGrid,
} from "@xyflow/react";
import { Grid3X3, Move, Trash2 } from "lucide-react";
import {
	type FC,
	type MouseEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { styled, theme } from "@/theme";
import { GRID_CELL_SIZE } from "@/utils/layout";
import {
	createPage,
	type FlowPage,
	loadWorkspaceState,
	saveWorkspaceState,
} from "@/utils/persistence";
import { ClipOverlay, WireClips } from "../clips/WireClips";
import { Box } from "../ui/Box";
import { ControlPanel, IconButton, PanelButton } from "../ui/Controls";
import { PageSwitcher } from "./PageSwitcher";

import "@xyflow/react/dist/style.css";
import {
	WeightedConnectionLine,
	WeightedEdge,
	type WeightedEdgeType,
} from "../edges/WeightedEdge";
import { NumberNode, type NumberNodeType } from "../nodes/NumberNode";

const SNAP_GRID: SnapGrid = [GRID_CELL_SIZE, GRID_CELL_SIZE];
const FINE_GRID_DOT_SIZE = 1.6;
const ACTION_MENU_OFFSET = 8;
const ACTION_MENU_EDGE_MARGIN = 12;

type ActionMenuTarget = {
	kind: "edge" | "clip";
	id: string;
	left: number;
	top: number;
};

const PageControls = styled("div", {
	display: "flex",
	alignItems: "center",
	gap: "$lg",
	minHeight: "44px",
});

const RepositionLabel = styled("span", {
	"@media (max-width: 600px)": { display: "none" },
});

const FloatingActionButton = styled(IconButton, {
	position: "fixed",
	boxShadow: "$panel",
	zIndex: 20,
});

const CanvasHint = styled("div", {
	color: "$text-muted",
	fontSize: "$caption",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	flexWrap: "wrap",
	gap: "$sm $lg",
	pointerEvents: "none",
});

const HintItem = styled("span", {
	display: "inline-flex",
	alignItems: "center",
	gap: "$sm",
	whiteSpace: "nowrap",
});

const GestureIcon = styled("span", {
	display: "inline-flex",
	alignItems: "center",
	gap: "3px",
	fontSize: "0.75rem",
	fontWeight: "$medium",
	lineHeight: 1,
});

const KeyIcon = styled("kbd", {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	minWidth: "32px",
	height: "25px",
	padding: "0 5px",
	border: "1px solid currentColor",
	borderBottomWidth: "3px",
	borderRadius: "5px",
	fontFamily: "$body",
	fontSize: "0.75rem",
	fontWeight: "$medium",
	lineHeight: 1,
});

const MouseIcon = ({ gesture }: { gesture: "click" | "double" | "drag" }) => (
	<GestureIcon>
		<svg
			width="20"
			height="24"
			viewBox="0 0 24 28"
			fill="none"
			role="img"
			aria-label={
				gesture === "double"
					? "Double left-click"
					: gesture === "drag"
						? "Left-drag"
						: "Left-click"
			}
		>
			<path d="M12 3a8 8 0 0 0-8 8v2h8Z" fill="currentColor" />
			<rect
				x="4"
				y="3"
				width="16"
				height="23"
				rx="8"
				stroke="currentColor"
				strokeWidth="1.8"
			/>
			<path d="M12 3v10M4 13h16" stroke="currentColor" strokeWidth="1.8" />
		</svg>
		{gesture === "double" && <span aria-hidden>2×</span>}
		{gesture === "drag" && <Move size={14} aria-hidden />}
	</GestureIcon>
);

const getActionMenuPosition = (event: MouseEvent) => ({
	left: Math.min(
		event.clientX + ACTION_MENU_OFFSET,
		window.innerWidth - ACTION_MENU_EDGE_MARGIN - 44,
	),
	top: Math.min(
		event.clientY + ACTION_MENU_OFFSET,
		window.innerHeight - ACTION_MENU_EDGE_MARGIN - 44,
	),
});

const snapPositionToGrid = (position: NumberNodeType["position"]) => ({
	x: Math.round(position.x / GRID_CELL_SIZE) * GRID_CELL_SIZE,
	y: Math.round(position.y / GRID_CELL_SIZE) * GRID_CELL_SIZE,
});

export const Root: FC = () => {
	const [workspace, setWorkspace] = useState(loadWorkspaceState);
	const { pages, activePageId } = workspace;
	const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
	const { nodes, edges, clips } = activePage;
	const updatePage = useCallback(
		(update: (page: FlowPage) => FlowPage) => {
			setWorkspace((previous) => ({
				...previous,
				pages: previous.pages.map((page) =>
					page.id === activePageId ? update(page) : page,
				),
			}));
		},
		[activePageId],
	);
	const setNodes = useCallback(
		(nodes: NumberNodeType[]) => {
			updatePage((page) => ({ ...page, nodes }));
		},
		[updatePage],
	);
	const setEdges = useCallback(
		(edges: WeightedEdgeType[]) => {
			updatePage((page) => ({ ...page, edges }));
		},
		[updatePage],
	);
	useEffect(() => saveWorkspaceState(workspace), [workspace]);

	const selectPage = (id: string) => {
		setActionMenu(null);
		setWorkspace((previous) => ({ ...previous, activePageId: id }));
	};
	const addPage = (name: string) => {
		setWorkspace((previous) => {
			let pageNumber = 1;
			while (previous.pages.some((page) => page.name === `Page ${pageNumber}`))
				pageNumber++;
			const page = createPage(name || `Page ${pageNumber}`);
			return { pages: [...previous.pages, page], activePageId: page.id };
		});
		setActionMenu(null);
	};
	const deletePage = (id: string) => {
		setWorkspace((previous) => {
			if (previous.pages.length === 1) return previous;
			const index = previous.pages.findIndex((page) => page.id === id);
			if (index < 0) return previous;
			return {
				pages: previous.pages.filter((page) => page.id !== id),
				activePageId:
					id === previous.activePageId
						? (previous.pages[index + 1] ?? previous.pages[index - 1]).id
						: previous.activePageId,
			};
		});
		setActionMenu(null);
	};
	const [snapToGrid, setSnapToGrid] = useState(false);
	const [actionMenu, setActionMenu] = useState<ActionMenuTarget | null>(null);
	const fineGridId = useId();
	const reactFlowRef =
		useRef<ReactFlowInstance<NumberNodeType, WeightedEdgeType>>(null);

	const buildEdge = useCallback((connection: Connection): WeightedEdgeType => {
		const edgeId = `e-${connection.source}-${connection.sourceHandle ?? "s"}-${connection.target}-${connection.targetHandle ?? "t"}-${Date.now()}`;
		return {
			id: edgeId,
			...connection,
			type: "weighted",
		};
	}, []);

	const createNumberNode = useCallback(
		(id: string, position: NumberNodeType["position"]): NumberNodeType => ({
			id,
			type: "number" as const,
			position,
			data: { expression: "", inputs: [], computedValue: null },
		}),
		[],
	);

	const onConnect = useCallback(
		(connection: Connection) => {
			const nextEdges = addEdge(buildEdge(connection), edges);
			setEdges(nextEdges);
		},
		[buildEdge, edges, setEdges],
	);
	const onNodesChange = useCallback(
		(changes: NodeChange<NumberNodeType>[]) => {
			updatePage((page) => {
				const nextNodes = applyNodeChanges(changes, page.nodes);
				const nodeIds = new Set(nextNodes.map((node) => node.id));
				return {
					...page,
					nodes: nextNodes,
					edges: page.edges.filter(
						(edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
					),
				};
			});
		},
		[updatePage],
	);
	const onEdgesChange = useCallback(
		(changes: EdgeChange<WeightedEdgeType>[]) => {
			updatePage((page) => ({
				...page,
				edges: applyEdgeChanges(changes, page.edges),
			}));
		},
		[updatePage],
	);
	const onPaneClick = useCallback(
		(event: MouseEvent) => {
			setActionMenu(null);
			if (event.detail !== 2) return;

			const position = reactFlowRef.current?.screenToFlowPosition(
				{
					x: event.clientX,
					y: event.clientY,
				},
				{ snapToGrid: false },
			);
			if (!position) return;

			const id = crypto.randomUUID();
			const nodePosition = snapToGrid ? snapPositionToGrid(position) : position;
			const nextNodes = [...nodes, createNumberNode(id, nodePosition)];
			setNodes(nextNodes);
		},
		[createNumberNode, nodes, setNodes, snapToGrid],
	);
	const onEdgeClick = useCallback(
		(event: MouseEvent, edge: WeightedEdgeType) => {
			event.stopPropagation();
			setActionMenu({
				kind: "edge",
				id: edge.id,
				...getActionMenuPosition(event),
			});
		},
		[],
	);
	const removeActionMenuTarget = useCallback(() => {
		if (!actionMenu) return;
		if (actionMenu.kind === "clip") {
			updatePage((page) => ({
				...page,
				clips: page.clips.filter((clip) => clip.id !== actionMenu.id),
			}));
		} else {
			const nextEdges = edges.filter((edge) => edge.id !== actionMenu.id);
			setEdges(nextEdges);
		}

		setActionMenu(null);
	}, [actionMenu, edges, setEdges, updatePage]);
	const snapNodesToGrid = useCallback(() => {
		const nextNodes = nodes.map((node) => ({
			...node,
			position: snapPositionToGrid(node.position),
		}));
		setNodes(nextNodes);
	}, [nodes, setNodes]);
	const nodeTypes = useMemo(() => ({ number: NumberNode }), []);
	const edgeTypes = useMemo(() => ({ weighted: WeightedEdge }), []);

	return (
		<Box column center style={{ width: "100vw", height: "100vh" }}>
			<WireClips
				key={activePage.id}
				clips={clips}
				edgeIds={edges.map((edge) => edge.id)}
				onChange={(clips) => {
					setActionMenu(null);
					updatePage((page) => ({ ...page, clips }));
				}}
				toFlowPosition={(point) =>
					reactFlowRef.current?.screenToFlowPosition(point, {
						snapToGrid: false,
					}) ?? point
				}
				onClipClick={(event, id) =>
					setActionMenu({ kind: "clip", id, ...getActionMenuPosition(event) })
				}
			>
				<ReactFlow
					key={activePage.id}
					defaultViewport={activePage.viewport}
					onMoveEnd={(_, viewport) =>
						updatePage((page) => ({ ...page, viewport }))
					}
					{...{ nodes, edges, onNodesChange, onEdgesChange, onConnect }}
					nodeTypes={nodeTypes}
					edgeTypes={edgeTypes}
					connectionLineComponent={WeightedConnectionLine}
					onInit={(reactFlow) => {
						reactFlowRef.current = reactFlow;
					}}
					onEdgeClick={onEdgeClick}
					onPaneClick={onPaneClick}
					panOnDrag={[1]}
					panOnScroll
					snapGrid={SNAP_GRID}
					snapToGrid={snapToGrid}
					zoomOnDoubleClick={false}
					zoomOnScroll={false}
				>
					<ClipOverlay />
					<Panel position="top-left">
						<PageControls>
							<PageSwitcher
								pages={pages}
								activePageId={activePageId}
								onSelect={selectPage}
								onCreate={addPage}
								onDelete={deletePage}
							/>
						</PageControls>
					</Panel>
					<Panel position="top-right">
						<ControlPanel>
							<PanelButton
								aria-label={`${snapToGrid ? "Disable" : "Enable"} grid snapping`}
								aria-pressed={snapToGrid}
								className="nopan"
								onClick={() => setSnapToGrid((enabled) => !enabled)}
								title={`${snapToGrid ? "Disable" : "Enable"} grid snapping`}
								type="button"
							>
								<Grid3X3 aria-hidden size={18} strokeWidth={2} />
								Snap
							</PanelButton>
							<PanelButton
								aria-label="Reposition nodes to closest grid cells"
								className="nopan"
								onClick={snapNodesToGrid}
								title="Reposition nodes to closest grid cells"
								type="button"
							>
								<Move aria-hidden size={18} strokeWidth={2} />
								<RepositionLabel>Reposition</RepositionLabel>
							</PanelButton>
						</ControlPanel>
					</Panel>
					{actionMenu && (
						<FloatingActionButton
							appearance="danger"
							aria-label={`Remove ${actionMenu.kind}`}
							className="nodrag nopan"
							onClick={removeActionMenuTarget}
							style={{
								left: actionMenu.left,
								top: actionMenu.top,
							}}
							title={`Remove ${actionMenu.kind}`}
							type="button"
						>
							<Trash2 aria-hidden size={18} strokeWidth={2} />
						</FloatingActionButton>
					)}
					<Background
						id={fineGridId}
						color={theme.colors.grid.toString()}
						gap={GRID_CELL_SIZE}
						offset={FINE_GRID_DOT_SIZE / 2}
						size={FINE_GRID_DOT_SIZE}
						variant={BackgroundVariant.Dots}
					/>
					<Panel
						position="bottom-center"
						style={{
							pointerEvents: "none",
							width: "calc(100% - 32px)",
							textAlign: "center",
						}}
					>
						<CanvasHint aria-label="Canvas shortcuts">
							<HintItem>
								<MouseIcon gesture="double" /> Add number
							</HintItem>
							<HintItem>
								<MouseIcon gesture="click" /> Edit number
							</HintItem>
							<HintItem>
								<KeyIcon>Ctrl</KeyIcon>
								<span aria-hidden>+</span>
								<MouseIcon gesture="drag" /> Clip wires
							</HintItem>
						</CanvasHint>
					</Panel>
				</ReactFlow>
			</WireClips>
		</Box>
	);
};
