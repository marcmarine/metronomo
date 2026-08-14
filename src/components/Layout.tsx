import { animated, useSpring } from "@react-spring/web";
import Controls from "../components/Controls";
import Metronomo from "../components/Metronomo";
import { useLayoutContext } from "../contexts/LayoutContext";
import { useTempoContext } from "../contexts/TempoContext";
import { useKeyboardControls } from "../lib/useKeyboardControls";
import { useWheelTempo } from "../lib/useWheelTempo";
import FullScreen from "./FullScreen";

const Layout = () => {
	const { isFullScreen, toggleFullScreen, sidebar } = useLayoutContext();
	const { increaseTempo, decreaseTempo, togglePlay } = useTempoContext();

	useKeyboardControls({
		increaseTempo,
		decreaseTempo,
		togglePlay,
		toggleFullScreen,
	});

	useWheelTempo({
		increaseTempo,
		decreaseTempo,
	});

	const props = useSpring({
		y: sidebar ? "-8%" : "-4%",
		config: { tension: 420, friction: 20 },
	});

	return (
		<FullScreen
			enabled={isFullScreen}
			onChange={(enabled) => {
				if (enabled !== isFullScreen) toggleFullScreen();
			}}
			className="p-4"
		>
			<animated.div style={props}>
				<Metronomo />
			</animated.div>
			<Controls className="fixed left-1/2 -translate-x-1/2 bottom-[8%]" />
		</FullScreen>
	);
};

export default Layout;
