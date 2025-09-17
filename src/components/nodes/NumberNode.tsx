import {
	Handle,
	type Node,
	type NodeProps,
	Position,
	useEdges,
	useNodeId,
	useNodes,
	useReactFlow,
} from "@xyflow/react";
import type { ChangeEvent, FC } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { styled } from "@/theme";
import { compute, evaluate } from "@/utils/math";
import { updateOne } from "@/utils/state";
import type { WeightedEdgeType } from "../edges/WeightedEdge";
import { Box } from "../ui/Box";
import { StyledText } from "../ui/Typography";
import { LocalHandle } from "./LocalHandle";

export type NumberNodeType = Node<
	{
		expression: string;
		inputs: string[];
		computedValue: number | null;
	},
	"number"
>;

const StyledInput = styled("input", {
	fontSize: "$normal",
	width: "100%",
	height: "100%",
	border: "none",
	padding: "0",
	"&:focus": {
		outline: "none",
	},
	textAlign: "center",
});

export const NumberNode: FC<NodeProps<NumberNodeType>> = ({
	data: { expression, inputs, computedValue },
}) => {
	const { setNodes } = useReactFlow();

	const outHandleId = useId();

	const nodeId = useNodeId();
	const allEdges = useEdges<WeightedEdgeType>();
	const allNodes = useNodes<NumberNodeType>();

	const [isEditing, setIsEditing] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const { upstreamMissing, upstreamVariablesJson } = useMemo(() => {
		if (!nodeId)
			return {
				upstreamMissing: true,
				upstreamVariablesJson: "{}",
			};
		const variables: Record<string, number> = {};
		let missing = false;
		const parts: string[] = [];
		for (const variable of inputs) {
			const edge = allEdges.find(
				(e) =>
					e.target === nodeId &&
					e.type === "weighted" &&
					e.targetHandle === variable,
			);
			const edgeId = edge?.id ?? "none";
			if (!edge) {
				missing = true;
				parts.push(`${variable}@${edgeId}=null`);
				continue;
			}
			const srcNode = allNodes.find((node) => node.id === edge.source);
			const value =
				typeof srcNode?.data.computedValue === "number"
					? srcNode.data.computedValue
					: null;
			if (value === null) {
				missing = true;
				parts.push(`${variable}@${edgeId}=null`);
			} else {
				variables[variable] = value;
				parts.push(`${variable}@${edgeId}=${value}`);
			}
		}
		// Ensure stable order
		parts.sort();
		const orderedVariables: Record<string, number> = {};
		for (const key of Object.keys(variables).sort()) {
			orderedVariables[key] = variables[key];
		}
		return {
			upstreamMissing: missing,
			upstreamVariablesJson: JSON.stringify(orderedVariables),
		};
	}, [allEdges, allNodes, inputs, nodeId]);

	useEffect(() => {
		if (!nodeId) return;

		if (upstreamMissing) {
			if (computedValue !== null) {
				setNodes(
					updateOne("id", nodeId, (node) => ({
						...node,
						data: { ...node.data, computedValue: null },
					})),
				);
			}
			return;
		}

		try {
			const variables = JSON.parse(upstreamVariablesJson) as Record<
				string,
				number
			>;
			const nextRaw = compute(expression, variables);
			const next = Number.isFinite(nextRaw) ? nextRaw : null;
			if (next !== computedValue) {
				setNodes(
					updateOne("id", nodeId, (node) => ({
						...node,
						data: {
							...node.data,
							computedValue: next,
						},
					})),
				);
			}
		} catch {
			if (computedValue !== null) {
				setNodes(
					updateOne("id", nodeId, (node) => ({
						...node,
						data: { ...node.data, computedValue: null },
					})),
				);
			}
		}
	}, [
		computedValue,
		expression,
		nodeId,
		setNodes,
		upstreamMissing,
		upstreamVariablesJson,
	]);

	const handleChange = ({
		currentTarget: { value: current },
	}: ChangeEvent<HTMLInputElement>) => {
		if (!nodeId) return;
		let nextInputs: string[] = [];
		try {
			nextInputs = current ? evaluate(current) : [];
		} catch {
			nextInputs = [];
		}
		setNodes(
			updateOne("id", nodeId, (node) => ({
				...node,
				data: { ...node.data, expression: current, inputs: nextInputs },
			})),
		);
	};

	return (
		<Box
			column
			center
			css={{
				border: "solid $border-default",
				borderWidth: "$thin",
				borderRadius: "$basic",
			}}
		>
			<Box
				center
				css={{
					width: "100%",
					borderBottom: "solid $border-default",
					borderWidth: "$thin",
				}}
			>
				<StyledText>Node</StyledText>
			</Box>

			<Box
				css={{
					width: "100%",
					height: "100%",
					paddingBlock: "$xs",
					alignItems: "stretch",
				}}
			>
				<Box
					column
					center
					css={{ gap: "$xs", marginLeft: inputs.length > 0 ? "-$sm" : "0" }}
				>
					{inputs.map((name) => (
						<LocalHandle
							key={name}
							type="target"
							id={name}
							label={name}
							position={Position.Left}
						/>
					))}
				</Box>

				<Box
					css={{ width: "100%", position: "relative", paddingInline: "$xs" }}
				>
					<Box
						center
						css={{
							alignSelf: "center",
							position: "absolute",
							pointerEvents: "none",
							height: "100%",
							width: "100%",
							display: isEditing ? "none" : "flex",
						}}
					>
						<StyledText>{computedValue ?? "NULL"}</StyledText>
					</Box>
					<StyledInput
						ref={inputRef}
						type="text"
						value={expression ?? ""}
						onChange={handleChange}
						className="nodrag"
						onFocus={() => setIsEditing(true)}
						onBlur={() => setIsEditing(false)}
						css={{
							opacity: isEditing ? 1 : 0,
						}}
					/>

					<Handle type="source" id={outHandleId} position={Position.Right} />
				</Box>
			</Box>
		</Box>
	);
};
