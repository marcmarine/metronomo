import { animated, useSpring } from "@react-spring/web";
import { useLayoutContext } from "../contexts/LayoutContext";
import { useTempoContext } from "../contexts/TempoContext";

const config = { tension: 220, friction: 20 };

const Controls = ({ className }: { className?: string }) => {
	const { sidebar, toggleSidebar, isFullScreen, toggleFullScreen } =
		useLayoutContext();
	const { tempo, tempos, increaseTempo, decreaseTempo, togglePlay, isPlaying } =
		useTempoContext();

	const menuProps = useSpring({
		transform: sidebar ? "rotate(90deg) scale(0.68)" : "rotate(0deg) scale(1)",
		transition: "none",
		config,
	});
	const playButtonProps = useSpring({
		y: sidebar ? -120 : 0,
		rotate: sidebar ? 0 : 180,
		width: sidebar ? 100 : 0,
		height: sidebar ? 100 : 0,
		config,
	});

	const decreaseProps = useSpring({
		y: sidebar ? -20 : 0,
		x: sidebar ? -100 : 0,
		scale: sidebar ? 1 : 0.5,
		rotate: sidebar ? 0 : -180,
		transition: "none",
		config,
	});

	const increaseProps = useSpring({
		y: sidebar ? -20 : 0,
		x: sidebar ? 100 : 0,
		scale: sidebar ? 1 : 0.5,
		rotate: sidebar ? 0 : -180,
		transition: "none",
		config,
	});

	const tempoProps = useSpring({
		y: sidebar ? -45 : 0,
		opacity: sidebar ? 1 : 0,
		config,
	});

	return (
		<div className={["", className].filter(Boolean).join(" ")}>
			<animated.p
				className="tempo absolute top-1/2 left-1/2 -translate-1/2 text-nowrap"
				style={tempoProps}
			>
				{tempo} ppm
			</animated.p>
			{/* Menu Toggle Button */}
			<animated.button
				className="btn bg-[#666]! absolute top-1/2 left-1/2 -translate-1/2 z-10"
				onClick={toggleSidebar}
				title="Toggle Menu"
				type="button"
				style={menuProps}
			>
				<svg
					className="w-full h-full md:w-5/6 md:h-5/6 p-2 stroke-[#312f31] stroke-8"
					viewBox="0 0 40 40"
				>
					<title>Icono Menu</title>
					<line x1="5" y1="0" x2="5" y2="40"></line>
					<line x1="20" y1="0" x2="20" y2="40"></line>
					<line x1="35" y1="0" x2="35" y2="40"></line>
				</svg>
			</animated.button>

			<animated.div
				className="absolute top-1/2 left-1/2 -translate-1/2 size-28"
				inert={!sidebar}
				aria-hidden={!sidebar}
			>
				<div className="relative size-full">
					<button
						className="btn hidden! lg:flex"
						onClick={toggleFullScreen}
						title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
						type="button"
					>
						{isFullScreen ? (
							<svg
								className="w-3/4 h-3/4"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<title>Exit Fullscreen</title>
								<path d="M0 0h24v24H0z" fill="none" />
								<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
							</svg>
						) : (
							<svg
								className="w-3/4 h-3/4"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<title>Enter Fullscreen</title>
								<path d="M0 0h24v24H0z" fill="none" />
								<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
							</svg>
						)}
					</button>

					{/* Decrease Tempo */}
					<animated.button
						className="btn absolute inset-1/2 -translate-1/2"
						onClick={decreaseTempo}
						disabled={tempo <= (tempos[0] ?? tempo)}
						title="Decrease Tempo"
						type="button"
						style={decreaseProps}
					>
						<svg
							className="w-3/4 h-3/4"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<title>Decrease Tempo</title>
							<path d="M0 0h24v24H0z" fill="none" />
							<path d="M19 13H5v-2h14v2z" />
						</svg>
					</animated.button>

					{/* Play/Pause Toggle */}
					<animated.button
						className="btn absolute inset-1/2 -translate-1/2"
						onClick={togglePlay}
						title={isPlaying ? "Pause" : "Play"}
						type="button"
						style={playButtonProps}
					>
						{isPlaying ? (
							<svg
								className="w-3/4 h-3/4"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<title>Pause</title>
								<path
									d="M0 0h24v24H0V0z"
									fill="none"
									vector-effect="non-scaling-stroke"
								/>
								<path
									d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"
									vector-effect="non-scaling-stroke"
								/>
							</svg>
						) : (
							<svg
								className="w-3/4 h-3/4"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
								fill="currentColor"
							>
								<title>Play</title>
								<path d="M8 5V19L19 12L8 5Z" />
							</svg>
						)}
					</animated.button>

					{/* Increase Tempo */}
					<animated.button
						className="btn absolute inset-1/2 -translate-1/2"
						onClick={increaseTempo}
						disabled={tempo >= (tempos[tempos.length - 1] ?? tempo)}
						title="Increase Tempo"
						type="button"
						style={increaseProps}
					>
						<svg
							className="w-3/4 h-3/4"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<title>Increase</title>
							<path d="M0 0h24v24H0z" fill="none" />
							<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
						</svg>
					</animated.button>
				</div>
			</animated.div>
		</div>
	);
};

export default Controls;
