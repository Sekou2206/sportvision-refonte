// Pour chaque photo : visage trouvé ?, angle de la tête (lacet, en degrés), qualité de capture (0..1).
// Sert à choisir plusieurs photos de référence d'angles différents. Usage : visage_info photo1.jpg …
import Foundation
import Vision
import CoreImage
import ImageIO
for chemin in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: chemin)
  guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
        let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
        let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: 2000, kCGImageSourceCreateThumbnailWithTransform: true] as CFDictionary) else { print("\(chemin)\t0"); continue }
  _ = props
  let h = VNImageRequestHandler(cgImage: cg, options: [:])
  let q = VNDetectFaceCaptureQualityRequest(), r = VNDetectFaceRectanglesRequest()
  try? h.perform([q, r])
  let faces = (q.results ?? []).sorted { $0.boundingBox.width > $1.boundingBox.width }
  guard let f = faces.first else { print("\(chemin)\t0"); continue }
  let yaw = (r.results ?? []).max(by: { $0.boundingBox.width < $1.boundingBox.width })?.yaw?.doubleValue ?? 0
  print("\(chemin)\t\(faces.count)\t\(String(format: "%.3f", f.boundingBox.width))\t\(String(format: "%.0f", yaw * 180 / .pi))\t\(String(format: "%.2f", f.faceCaptureQuality ?? 0))")
}
