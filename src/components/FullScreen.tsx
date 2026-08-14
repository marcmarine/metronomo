import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type FullScreenProps = {
	enabled: boolean;
	onChange?: (enabled: boolean) => void;
	children?: ReactNode;
	className?: string;
};

/**
 * Fullscreen wrapper built directly on the native Fullscreen API.
 *
 * Drop-in replacement for the discontinued `react-full-screen` package:
 * keeps the same `enabled` / `onChange` props and the `fullscreen` /
 * `fullscreen-enabled` wrapper classes.
 */
function FullScreen({
	enabled,
	onChange,
	children,
	className,
}: FullScreenProps) {
	const nodeRef = useRef<HTMLDivElement>(null);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	// Keep the DOM in sync with the `enabled` prop.
	useEffect(() => {
		const node = nodeRef.current;
		if (!node) return;

		const isNodeFullscreen = document.fullscreenElement === node;
		if (enabled && !isNodeFullscreen) {
			node.requestFullscreen().catch(() => {
				// Request rejected (e.g. without user gesture): report back so the
				// state stays consistent with the real fullscreen status.
				onChangeRef.current?.(false);
			});
		} else if (!enabled && isNodeFullscreen) {
			document.exitFullscreen().catch(() => undefined);
		}
	}, [enabled]);

	// Track exits triggered outside the component (e.g. pressing Escape).
	useEffect(() => {
		const detect = () => {
			onChangeRef.current?.(document.fullscreenElement === nodeRef.current);
		};
		document.addEventListener("fullscreenchange", detect);
		return () => document.removeEventListener("fullscreenchange", detect);
	}, []);

	return (
		<div
			ref={nodeRef}
			className={[
				className,
				enabled ? "fullscreen fullscreen-enabled" : "fullscreen",
			]
				.filter(Boolean)
				.join(" ")}
			style={enabled ? { height: "100%", width: "100%" } : undefined}
		>
			{children}
		</div>
	);
}

export default FullScreen;
