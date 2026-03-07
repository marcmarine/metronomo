import { useLayoutContext } from '../contexts/LayoutContext'
import { useTempoContext } from '../contexts/TempoContext'

const Controls = () => {
  const { sidebar, toggleSidebar, isFullScreen, toggleFullScreen } = useLayoutContext()
  const { tempo, tempos, increaseTempo, decreaseTempo, togglePlay, isPlaying } = useTempoContext()

  const buttonBaseClass = "flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#d1d1d1] text-[#312f31] border-6 border-[#312f31] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"

  return (
    <div className="md:fixed top-4 right-4 flex md:flex-col gap-2 z-50 md:top-6 md:right-6 justify-center max-md:mt-3">
      {/* Menu Toggle Button */}
      <button
        className={`${buttonBaseClass} bg-[#666]!`}
        onClick={toggleSidebar}
        title="Toggle Menu"
      >
        <svg className="w-full h-full md:w-5/6 md:h-5/6 p-2 stroke-[#312f31] stroke-8" viewBox="0 0 40 40">
          <title>Icono Menu</title>
          <line x1="5" y1="0" x2="5" y2="40"></line>
          <line x1="20" y1="0" x2="20" y2="40"></line>
          <line x1="35" y1="0" x2="35" y2="40"></line>
        </svg>
      </button>

      {sidebar && (
        <div className="flex md:flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
          {/* Fullscreen Toggle - Hidden on small mobile screens to prevent clutter */}
          <button
            className={`${buttonBaseClass} hidden sm:flex`}
            onClick={toggleFullScreen}
            title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullScreen ? (
              <svg className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
            ) : (
              <svg className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
            )}
          </button>

          {/* Decrease Tempo */}
          <button
            className={buttonBaseClass}
            onClick={decreaseTempo}
            disabled={tempo <= (tempos[0] ?? tempo)}
            title="Decrease Tempo"
          >
            <svg className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 13H5v-2h14v2z"/></svg>
          </button>

          {/* Play/Pause Toggle */}
          <button
            className={buttonBaseClass}
            onClick={togglePlay}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 8.64L15.27 12 10 15.36V8.64M8 5v14l11-7L8 5z"/></svg>
            )}
          </button>

          {/* Increase Tempo */}
          <button
            className={buttonBaseClass}
            onClick={increaseTempo}
            disabled={tempo >= (tempos[tempos.length - 1] ?? tempo)}
            title="Increase Tempo"
          >
            <svg className="w-3/4 h-3/4" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default Controls
