import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTempoContext } from "../contexts/TempoContext";
import { useMetronomeEngine } from "../lib/useMetronomeEngine";
import { usePendulumWeightDrag } from "../lib/usePendulumWeightDrag";

import "./Metronomo.css";

/** Pivot point of the pendulum, in viewBox coordinates (base of the body). */
const PIVOT_X = 999.4;
const PIVOT_Y = 1091;

/** Vertical range (in viewBox units) over which the weight can slide.
 *  Matches the first and last scale marks so each tempo step lines up
 *  with a mark. There are 37 tempos and 37 marks, evenly spaced. */
const WEIGHT_TOP = 382.2;
const WEIGHT_BOTTOM = 803;

const Metronomo: React.FC = () => {
	const { tempo, isPlaying, tempos, setTempo, togglePlay } = useTempoContext();

	const [releaseAngle, setReleaseAngle] = useState(0);

	// Reset the wind-up angle when playback stops, so the next start from the
	// button begins cleanly from 0°.
	useEffect(() => {
		if (!isPlaying) setReleaseAngle(0);
	}, [isPlaying]);

	const handleReleaseToPlay = useCallback(
		(angle: number) => {
			setReleaseAngle(angle);
			togglePlay();
		},
		[togglePlay],
	);

	const { trackRef, dragProps, isDragging, manualAngle } =
		usePendulumWeightDrag({
			tempos,
			setTempo,
			onReleaseToPlay: handleReleaseToPlay,
			onClick: togglePlay,
			pivotX: PIVOT_X,
			pivotY: PIVOT_Y,
			maxDragAngle: 15,
			disabled: isPlaying,
		});

	/**
	 * Audio + animation engine: stable AudioContext, tick sample preloading,
	 * pendulum animation and the audio scheduler (phase-locked with the pendulum).
	 */
	const { angleDeg, weightPosition } = useMetronomeEngine({
		tempo,
		tempos,
		isPlaying,
		initialAngle: releaseAngle,
	});

	// Map the weight's 0–100% position to a y coordinate inside the viewBox.
	const weightRatio = parseFloat(weightPosition) / 100;
	const weightY = WEIGHT_TOP + weightRatio * (WEIGHT_BOTTOM - WEIGHT_TOP);

	// While dragging, the pendulum follows the pointer's horizontal position
	// so the user can combine vertical tempo changes with horizontal movement.
	const angleToRender =
		isDragging && manualAngle != null ? manualAngle : angleDeg;

	return (
		<svg className="metronome" viewBox="750 350.9 500 792.2">
			<defs>
				{/* Clip the pendulum (rod + weight) with a wide rectangle so it can
					    swing freely past the body's narrow top contour. Only the very
					    bottom of the rod (below the weight's lowest reach) is trimmed.
					    Horizontal range matches the viewBox so the clip never cuts the
					    swinging weight at the sides. */}
				<clipPath id="metronome-pendulum-clip">
					<rect x="750" y="360" width="500" height="492" />
				</clipPath>
			</defs>

			<line
				id="metronome-ground-line"
				className="metronome__stroke"
				x1="800"
				y1="1138.1"
				x2="1200"
				y2="1138.1"
			/>
			<g id="metronome-feet">
				<g id="metronome-foot-right">
					<circle
						className="metronome__base-bottom"
						cx="1145.5"
						cy="1111.4"
						r="22.7"
					/>
				</g>
				<g id="metronome-foot-left">
					<circle
						className="metronome__base-bottom"
						cx="853.3"
						cy="1111.4"
						r="22.7"
					/>
				</g>
			</g>
			<path
				id="base-superior"
				className="metronome__base-top"
				d="M1155.6,856.4H843.4L923,380.1c2.4-14,14.5-24.2,28.7-24.2h95.3c14.2,0,26.3,10.2,28.7,24.2L1155.6,856.4z"
			/>
			<path
				id="base-inferior"
				className="metronome__base-bottom"
				d="M1155.6,856.4l33.8,201.2c3,17.7-10.7,33.9-28.7,33.9H838.4c-18,0-31.7-16.2-28.7-33.9 l33.8-201"
			/>
			<g id="metronome-scale-marks">
				<line
					className="metronome__mark"
					x1="950.5"
					y1="382.2"
					x2="999.4"
					y2="382.2"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="393.9"
					x2="1048.2"
					y2="393.9"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="405.6"
					x2="999.4"
					y2="405.6"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="417.2"
					x2="1048.2"
					y2="417.2"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="428.9"
					x2="999.4"
					y2="428.9"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="440.6"
					x2="1048.2"
					y2="440.6"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="452.3"
					x2="999.4"
					y2="452.3"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="464"
					x2="1048.2"
					y2="464"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="475.7"
					x2="999.4"
					y2="475.7"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="487.4"
					x2="1048.2"
					y2="487.4"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="499.1"
					x2="999.4"
					y2="499.1"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="510.8"
					x2="1048.2"
					y2="510.8"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="522.5"
					x2="999.4"
					y2="522.5"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="534.2"
					x2="1048.2"
					y2="534.2"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="545.8"
					x2="999.4"
					y2="545.8"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="557.5"
					x2="1048.2"
					y2="557.5"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="569.2"
					x2="999.4"
					y2="569.2"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="580.9"
					x2="1048.2"
					y2="580.9"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="592.6"
					x2="999.4"
					y2="592.6"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="604.3"
					x2="1048.2"
					y2="604.3"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="616"
					x2="999.4"
					y2="616"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="627.7"
					x2="1048.2"
					y2="627.7"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="639.4"
					x2="999.4"
					y2="639.4"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="651.1"
					x2="1048.2"
					y2="651.1"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="662.7"
					x2="999.4"
					y2="662.7"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="674.4"
					x2="1048.2"
					y2="674.4"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="686.1"
					x2="999.4"
					y2="686.1"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="697.8"
					x2="1048.2"
					y2="697.8"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="709.5"
					x2="999.4"
					y2="709.5"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="721.2"
					x2="1048.2"
					y2="721.2"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="732.9"
					x2="999.4"
					y2="732.9"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="744.6"
					x2="1048.2"
					y2="744.6"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="756.3"
					x2="999.4"
					y2="756.3"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="768"
					x2="1048.2"
					y2="768"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="779.6"
					x2="999.4"
					y2="779.6"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="791.3"
					x2="1048.2"
					y2="791.3"
				/>
				<line
					className="metronome__mark"
					x1="950.5"
					y1="803"
					x2="999.4"
					y2="803"
				/>
				<line
					className="metronome__mark"
					x1="999.4"
					y1="380.4"
					x2="999.4"
					y2="854.4"
				/>
			</g>
			<path
				id="metronome-body-divider-stroke"
				className="metronome__stroke"
				d="M843.4,856.6h312.2H843.4z"
			/>
			<path
				id="metronome-body-outline-stroke"
				className="metronome__stroke"
				d="M864.4,1091.6c6.9,3.9,11.6,11.3,11.6,19.8c0,12.5-10.2,22.7-22.7,22.7s-22.7-10.2-22.7-22.7
              c0-8.5,4.7-15.9,11.6-19.8l0,0h-3.8c-18,0-31.7-16.2-28.7-33.9l33.8-201v-0.2L923,380.1c2.4-14,14.5-24.2,28.7-24.2h95.3
              c14.2,0,26.3,10.2,28.7,24.2l79.9,476.3l33.8,201.2c3,17.7-10.7,33.9-28.7,33.9h-4.1l0,0c6.9,3.9,11.6,11.3,11.6,19.8
              c0,12.5-10.2,22.7-22.7,22.7s-22.7-10.2-22.7-22.7c0-8.5,4.7-15.9,11.6-19.8L864.4,1091.6z"
			/>

			{/* Pendulum: rod + weight, clipped to a wide area and rotated around the pivot. */}
			<g clipPath="url(#metronome-pendulum-clip)">
				<g
					id="metronome-pendulum"
					transform={`rotate(${angleToRender} ${PIVOT_X} ${PIVOT_Y})`}
				>
					<line
						className="metronome__pendulum-rod"
						x1={PIVOT_X}
						y1={PIVOT_Y}
						x2={PIVOT_X}
						y2="370"
					/>
					<svg
						x={PIVOT_X - 52}
						y={weightY}
						width="104"
						height="94"
						viewBox="0 0 104 94"
						className="metronome__weight"
						preserveAspectRatio="xMidYMid meet"
					>
						<g id="metronome-pendulum-assembly">
							<g id="metronome-weight">
								<g id="metronome-weight-body">
									<path
										fill="#666"
										d="M86 79a13 13 0 01-12 10H30a13 13 0 01-12-10L5 15a8 8 0 018-10h78a8 8 0 018 10z"
									/>
									<path
										className="metronome__stroke"
										d="M86 79a13 13 0 01-12 10H30a13 13 0 01-12-10L5 15a8 8 0 018-10h78a8 8 0 018 10z"
									/>
								</g>
								<g id="metronome-weight-circles">
									<circle
										id="metronome-weight-circle-right"
										cx="72.6"
										cy="28.3"
										r="12.5"
										fill="#313131"
									/>
									<circle
										id="metronome-weight-circle-left"
										cx="31.6"
										cy="28.3"
										r="12.5"
										fill="#313131"
									/>
								</g>
							</g>
						</g>
					</svg>
					<rect
						ref={trackRef}
						className="metronome__drag-track"
						x="800"
						y={WEIGHT_TOP}
						width="400"
						height={WEIGHT_BOTTOM - WEIGHT_TOP}
						tabIndex={0}
						role="slider"
						aria-label="Drag sideways to start the metronome; drag vertically to change the tempo; click to start or stop"
						{...dragProps}
					/>
				</g>
			</g>
		</svg>
	);
};

export default Metronomo;
