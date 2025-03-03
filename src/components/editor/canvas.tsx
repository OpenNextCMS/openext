"use client"

export default function Canvas() {
  return (
    <div className="flex-1 bg-slate-100 overflow-auto">
      <div className="h-full w-full flex items-center justify-center">
        <div className="bg-white w-full h-[800px] shadow-md">{/* Blank canvas */}</div>
      </div>
    </div>
  )
}

