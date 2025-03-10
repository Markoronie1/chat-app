"use client"

import { useState } from "react"
import { FileIcon, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatFileSize, isImageFile, isVideoFile, isAudioFile } from "@/lib/firebase"

interface FileMessageProps {
  fileURL: string
  fileName: string
  fileType: string
  fileSize: number
}

export function FileMessage({ fileURL, fileName, fileType, fileSize }: FileMessageProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(fileURL)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading file:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Render different file types
  if (isImageFile(fileType)) {
    return (
      <div className="relative group">
        <img
          src={fileURL || "/placeholder.svg"}
          alt={fileName}
          className="max-w-full w-auto rounded-md max-h-[300px] object-contain bg-black/5 dark:bg-white/5"
        />
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-2 bg-black/50 hover:bg-black/70 text-white"
            onClick={handleDownload}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-1" />
            {isLoading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </div>
    )
  }

  if (isVideoFile(fileType)) {
    return (
      <div className="relative group">
        <video src={fileURL} controls className="max-w-full w-auto rounded-md max-h-[300px]">
          Your browser does not support the video tag.
        </video>
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-2 bg-black/50 hover:bg-black/70 text-white"
            onClick={handleDownload}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-1" />
            {isLoading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </div>
    )
  }

  if (isAudioFile(fileType)) {
    return (
      <div className="flex flex-col gap-2">
        <audio controls className="max-w-full w-full">
          <source src={fileURL} type={fileType} />
          Your browser does not support the audio element.
        </audio>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{fileName}</span>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleDownload} disabled={isLoading}>
            <Download className="h-3 w-3 mr-1" />
            {isLoading ? "..." : "Download"}
          </Button>
        </div>
      </div>
    )
  }

  // Default file display for other types (PDF, etc.)
  return (
    <div className="flex items-center p-3 border rounded-md bg-muted/30 max-w-full overflow-hidden">
      <div className="mr-3">
        <FileIcon className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate max-w-[200px] md:max-w-[300px]">{fileName}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(fileSize)} • {fileType.split("/")[1]?.toUpperCase() || fileType}
        </p>
      </div>
      <Button size="sm" variant="outline" className="ml-2" onClick={handleDownload} disabled={isLoading}>
        <Download className="h-4 w-4 mr-1" />
        {isLoading ? "..." : "Download"}
      </Button>
    </div>
  )
}

