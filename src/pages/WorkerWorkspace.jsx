import { useState, useRef } from 'react'

export default function WorkerWorkspace() {
  const [isRecording, setIsRecording] = useState(false)
  const [timer, setTimer] = useState(0)
  const [audioUrl, setAudioUrl] = useState(null)
  const mediaRecorderRef = useRef(null)
  const intervalRef = useRef(null)

  // Sample tasks from Chairman
  const tasks = [
    "How are you doing today?",
    "Where are you going?",
    "I am coming tomorrow"
  ]
  const [currentTask, setCurrentTask] = useState(0)

  // LISTEN FUNCTION
  const handleListen = () => {
    const utterance = new SpeechSynthesisUtterance(tasks[currentTask])
    speechSynthesis.speak(utterance)
  }

  // RECORD FUNCTION
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorderRef.current = new MediaRecorder(stream)
    const chunks = []
    
    mediaRecorderRef.current.ondataavailable = e => chunks.push(e.data)
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      setAudioUrl(URL.createObjectURL(blob))
    }
    
    mediaRecorderRef.current.start()
    setIsRecording(true)
    intervalRef.current = setInterval(() => setTimer(t => t+1), 1000)
  }

  const stopRecording = () => {
    mediaRecorderRef.current.stop()
    setIsRecording(false)
    clearInterval(intervalRef.current)
  }

  const handleSubmit = () => {
    alert("Recording submitted! 🎉 Na you do am Boss!")
    setAudioUrl(null)
    setTimer(0)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-2xl font-bold">Worker Workspace</h1>
      <p className="text-green-400">Welcome, Kingsley • Naija Pidgin</p>

      {/* Task Card */}
      <div className="mt-6 p-6 rounded-2xl border border-green-500 bg-zinc-900">
        <span className="bg-green-200 text-black px-3 py-1 rounded-lg text-sm">
          Task {currentTask+1}: Translate to Pidgin
        </span>
        <p className="mt-4 text-gray-400">English text:</p>
        <p className="text-2xl font-bold mt-2">{tasks[currentTask]}</p>
        
        <button onClick={handleListen} className="mt-4 flex items-center gap-2 text-green-400">
          <span className="bg-green-400 text-black w-10 h-10 rounded-full flex items-center justify-center">▶</span> Listen
        </button>
      </div>

      {/* Record Button */}
      <div className="flex flex-col items-center mt-10">
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl shadow-2xl
          ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}
        >
          🎤
        </button>
        <p className="text-4xl mt-6 text-green-300 font-bold">
          00:{timer.toString().padStart(2,'0')}
        </p>
        <p className="text-green-300">{isRecording ? '● Recording...' : 'Tap to record'}</p>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mt-10">
        <button onClick={handleSubmit} className="flex-1 py-4 rounded-2xl border border-green-500">
          ✅ Submit
        </button>
        <button 
          onClick={() => { setCurrentTask((currentTask+1)%tasks.length); setTimer(0) }}
          className="flex-1 py-4 rounded-2xl bg-green-500 text-black font-bold"
        >
          Next Task →
        </button>
      </div>

      {audioUrl && (
        <audio controls src={audioUrl} className="w-full mt-6" />
      )}
    </div>
  )
}