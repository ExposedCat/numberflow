import { styled } from "@/theme";

export const PopupContent = styled("div", {
	boxSizing: "border-box",
	position: "absolute",
	zIndex: 10,
	padding: "$sm",
	border: "solid $border-default",
	borderWidth: "$thin",
	borderRadius: "$basic",
	backgroundColor: "$white",
	boxShadow: "0 0.5rem 1.25rem rgba(29, 28, 28, 0.18)",
});
