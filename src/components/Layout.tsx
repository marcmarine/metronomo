import { animated, useSpring } from "@react-spring/web";
import Metronomo from "../components/Metronomo";
import { useLayoutContext } from "../contexts/LayoutContext";
import { useTempoContext } from "../contexts/TempoContext";
import { useKeyboardControls } from "../lib/useKeyboardControls";
import { useWheelTempo } from "../lib/useWheelTempo";
import FullScreen from "./FullScreen";

const Layout = () => {
	const { isFullScreen, toggleFullScreen, isDragging } = useLayoutContext();
	const { tempo, increaseTempo, decreaseTempo, togglePlay } = useTempoContext();

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

	 const tempoProps = useSpring({
     opacity: isDragging ? 1 : 0,
  })

	return (
		<FullScreen
			enabled={isFullScreen}
			onChange={(enabled) => {
				if (enabled !== isFullScreen) toggleFullScreen();
			}}
			className="p-4"
		>
      <Metronomo />
     <animated.p className="tempo absolute top-[8vw] left-[8vw]" style={tempoProps}>{tempo} ppm</animated.p>
		</FullScreen>
	);
};

export default Layout;
