import {
	addEdge,
	Background,
	BackgroundVariant,
	type Connection,
	Panel,
	ReactFlow,
	type ReactFlowInstance,
	type SnapGrid,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import { Grid3X3, Move, Trash2 } from "lucide-react";
import {
	type FC,
	type MouseEvent,
	useCallback,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { styled } from "@/theme";
import { GRID_CELL_SIZE } from "@/utils/layout";
import { Box } from "../ui/Box";

import "@xyflow/react/dist/style.css";
import {
	WeightedConnectionLine,
	WeightedEdge,
	type WeightedEdgeType,
} from "../edges/WeightedEdge";
import { NumberNode, type NumberNodeType } from "../nodes/NumberNode";

const SNAP_GRID: SnapGrid = [GRID_CELL_SIZE, GRID_CELL_SIZE];
const MAJOR_GRID_GAP = GRID_CELL_SIZE * 5;
const FINE_GRID_DOT_SIZE = 1.3;
const MAJOR_GRID_DOT_SIZE = 1.6;
const ACTION_MENU_OFFSET = 8;
const ACTION_MENU_EDGE_MARGIN = 12;

type ActionMenuTarget =
	| { kind: "node"; id: string; left: number; top: number }
	| { kind: "edge"; id: string; left: number; top: number };

const SnapToggleButton = styled("button", {
	alignItems: "center",
	backgroundColor: "$white",
	border: "1px solid $border-default",
	borderRadius: "$inner",
	boxShadow: "0 0.25rem 0.75rem rgba(29, 28, 28, 0.12)",
	color: "$text-primary",
	cursor: "pointer",
	display: "inline-flex",
	fontFamily: "inherit",
	fontSize: "$small",
	fontWeight: "$semibold",
	gap: "$xs",
	height: "2.25rem",
	paddingInline: "$sm",

	"&:hover": {
		backgroundColor: "#f8fafc",
	},

	variants: {
		active: {
			true: {
				backgroundColor: "$interactive-primary",
				borderColor: "$interactive-primary",
				color: "$text-inverse",

				"&:hover": {
					backgroundColor: "$interactive-primary-hover",
				},
			},
		},
	},
});

const PanelControls = styled("div", {
	display: "inline-flex",
	gap: "$xs",
});

const FloatingActionMenu = styled("div", {
	backgroundColor: "$white",
	border: "1px solid $border-default",
	borderRadius: "$inner",
	boxShadow: "0 0.35rem 1rem rgba(29, 28, 28, 0.18)",
	display: "inline-flex",
	gap: "$xs",
	padding: "$xs",
	position: "fixed",
	zIndex: 20,
});

const FloatingActionButton = styled("button", {
	alignItems: "center",
	backgroundColor: "$white",
	border: "1px solid $border-default",
	borderRadius: "$inner",
	color: "$status-error",
	cursor: "pointer",
	display: "inline-flex",
	height: "2rem",
	justifyContent: "center",
	width: "2rem",

	"&:hover": {
		backgroundColor: "#fef2f2",
		borderColor: "$status-error",
	},
});

const getActionMenuPosition = (event: MouseEvent) => ({
	left: Math.min(
		event.clientX + ACTION_MENU_OFFSET,
		window.innerWidth - ACTION_MENU_EDGE_MARGIN,
	),
	top: Math.min(
		event.clientY + ACTION_MENU_OFFSET,
		window.innerHeight - ACTION_MENU_EDGE_MARGIN,
	),
});

const snapPositionToGrid = (position: NumberNodeType["position"]) => ({
	x: Math.round(position.x / GRID_CELL_SIZE) * GRID_CELL_SIZE,
	y: Math.round(position.y / GRID_CELL_SIZE) * GRID_CELL_SIZE,
});

export const Root: FC = () => {
	const [nodes, setNodes, onNodesChange] = useNodesState<NumberNodeType>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<WeightedEdgeType>([]);
	const [snapToGrid, setSnapToGrid] = useState(false);
	const [actionMenu, setActionMenu] = useState<ActionMenuTarget | null>(null);
	const fineGridId = useId();
	const majorGridId = useId();
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
		(connection: Connection) =>
			setEdges((prev) => addEdge(buildEdge(connection), prev)),
		[buildEdge, setEdges],
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

			const id = Date.now().toString();
			const nodePosition = snapToGrid ? snapPositionToGrid(position) : position;
			setNodes((prev) => [...prev, createNumberNode(id, nodePosition)]);
		},
		[createNumberNode, setNodes, snapToGrid],
	);
	const onNodeClick = useCallback((event: MouseEvent, node: NumberNodeType) => {
		event.stopPropagation();
		setActionMenu({
			kind: "node",
			id: node.id,
			...getActionMenuPosition(event),
		});
	}, []);
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

		if (actionMenu.kind === "node") {
			setNodes((prev) => prev.filter((node) => node.id !== actionMenu.id));
			setEdges((prev) =>
				prev.filter(
					(edge) =>
						edge.source !== actionMenu.id && edge.target !== actionMenu.id,
				),
			);
		} else {
			setEdges((prev) => prev.filter((edge) => edge.id !== actionMenu.id));
		}

		setActionMenu(null);
	}, [actionMenu, setEdges, setNodes]);
	const snapNodesToGrid = useCallback(() => {
		setNodes((prev) =>
			prev.map((node) => ({
				...node,
				position: snapPositionToGrid(node.position),
			})),
		);
	}, [setNodes]);

	const nodeTypes = useMemo(() => ({ number: NumberNode }), []);
	const edgeTypes = useMemo(() => ({ weighted: WeightedEdge }), []);

	return (
		<Box column center style={{ width: "100vw", height: "100vh" }}>
			<ReactFlow
				{...{ nodes, edges, onNodesChange, onEdgesChange, onConnect }}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				connectionLineComponent={WeightedConnectionLine}
				onInit={(reactFlow) => {
					reactFlowRef.current = reactFlow;
				}}
				onEdgeClick={onEdgeClick}
				onNodeClick={onNodeClick}
				onPaneClick={onPaneClick}
				panOnDrag={[1]}
				panOnScroll
				snapGrid={SNAP_GRID}
				snapToGrid={snapToGrid}
				zoomOnDoubleClick={false}
				zoomOnScroll={false}
			>
				<Panel position="top-right">
					<PanelControls>
						<SnapToggleButton
							active={snapToGrid}
							aria-label={`${snapToGrid ? "Disable" : "Enable"} grid snapping`}
							aria-pressed={snapToGrid}
							className="nopan"
							onClick={() => setSnapToGrid((enabled) => !enabled)}
							title={`${snapToGrid ? "Disable" : "Enable"} grid snapping`}
							type="button"
						>
							<Grid3X3 aria-hidden size={18} strokeWidth={2} />
							Snap
						</SnapToggleButton>
						<SnapToggleButton
							aria-label="Reposition nodes to closest grid cells"
							className="nopan"
							onClick={snapNodesToGrid}
							title="Reposition nodes to closest grid cells"
							type="button"
						>
							<Move aria-hidden size={18} strokeWidth={2} />
							Reposition
						</SnapToggleButton>
					</PanelControls>
				</Panel>
				{actionMenu && (
					<FloatingActionMenu
						className="nodrag nopan"
						style={{ left: actionMenu.left, top: actionMenu.top }}
					>
						<FloatingActionButton
							aria-label={`Remove ${actionMenu.kind}`}
							onClick={removeActionMenuTarget}
							title={`Remove ${actionMenu.kind}`}
							type="button"
						>
							<Trash2 aria-hidden size={18} strokeWidth={2} />
						</FloatingActionButton>
					</FloatingActionMenu>
				)}
				<Background
					id={fineGridId}
					color="#64748b"
					gap={GRID_CELL_SIZE}
					offset={FINE_GRID_DOT_SIZE / 2}
					size={FINE_GRID_DOT_SIZE}
					variant={BackgroundVariant.Dots}
				/>
				<Background
					id={majorGridId}
					color="#64748b"
					gap={MAJOR_GRID_GAP}
					offset={MAJOR_GRID_DOT_SIZE / 2}
					size={MAJOR_GRID_DOT_SIZE}
					variant={BackgroundVariant.Dots}
				/>
			</ReactFlow>
		</Box>
	);
};
