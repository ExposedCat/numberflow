import { styled } from "@/theme";

export const PopupContent = styled("div", {
	boxSizing: "border-box",
	position: "absolute",
	zIndex: 10,
	padding: "$md",
	border: "1px solid $border-default",
	borderRadius: "$basic",
	backgroundColor: "$surface",
	color: "$text-primary",
	fontSize: "$small",
	boxShadow: "$panel",
});
