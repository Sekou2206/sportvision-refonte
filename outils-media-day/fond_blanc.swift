// Fond blanc pur derrière le joueur (06/10/2026).
// Détourage par Vision (VNGenerateForegroundInstanceMaskRequest, « détacher le sujet » de Photos),
// en ne gardant que les sujets qui recouvrent la PERSONNE détectée (VNGeneratePersonSegmentationRequest) :
// une chaise ou un pied de toile détectés comme « sujet » ne passent pas. Le masque est calculé à la
// pleine résolution de la photo ; le joueur est posé sur du blanc pur ; métadonnées conservées.
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let sortie = CommandLine.arguments[1]
let ctx = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])

func masquePersonne(_ handler: VNImageRequestHandler) -> CIImage? {
  let r = VNGeneratePersonSegmentationRequest(); r.qualityLevel = .accurate
  r.outputPixelFormat = kCVPixelFormatType_OneComponent8
  try? handler.perform([r])
  guard let b = r.results?.first?.pixelBuffer else { return nil }
  return CIImage(cvPixelBuffer: b)
}

for chemin in CommandLine.arguments.dropFirst(2) {
  let url = URL(fileURLWithPath: chemin)
  guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
        let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
        let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("illisible \(chemin)"); continue }
  let orient = CGImagePropertyOrientation(rawValue: (props[kCGImagePropertyOrientation] as? UInt32) ?? 1) ?? .up
  let image = CIImage(cgImage: cg).oriented(orient)
  let handler = VNImageRequestHandler(ciImage: image, options: [:])
  let fg = VNGenerateForegroundInstanceMaskRequest()
  do { try handler.perform([fg]) } catch { print("échec \(chemin) \(error)"); continue }
  guard let obs = fg.results?.first else { print("aucun sujet \(url.lastPathComponent)"); continue }
  // Les sujets qui recouvrent la personne.
  var garder = IndexSet()
  if let pm = masquePersonne(handler) {
    let inst = CIImage(cvPixelBuffer: obs.instanceMask)   // étiquettes 0..n à la résolution du modèle
    let sx = inst.extent.width / pm.extent.width, sy = inst.extent.height / pm.extent.height
    let personneBas = pm.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
    var etiquettes = [UInt8](repeating: 0, count: Int(inst.extent.width * inst.extent.height))
    var pers = [UInt8](repeating: 0, count: etiquettes.count)
    ctx.render(inst, toBitmap: &etiquettes, rowBytes: Int(inst.extent.width), bounds: inst.extent, format: .L8, colorSpace: nil)
    ctx.render(personneBas, toBitmap: &pers, rowBytes: Int(inst.extent.width), bounds: inst.extent, format: .L8, colorSpace: nil)
    var total = [Int: Int](), recouvre = [Int: Int]()
    for i in 0..<etiquettes.count where etiquettes[i] > 0 {
      total[Int(etiquettes[i]), default: 0] += 1
      if pers[i] > 127 { recouvre[Int(etiquettes[i]), default: 0] += 1 }
    }
    for (k, n) in total where Double(recouvre[k] ?? 0) / Double(n) > 0.5 { garder.insert(k) }
  }
  if garder.isEmpty { garder = obs.allInstances }
  guard let mb = try? obs.generateScaledMaskForImage(forInstances: garder, from: handler) else { print("masque impossible \(url.lastPathComponent)"); continue }
  let masque = CIImage(cvPixelBuffer: mb)
  let blanc = CIImage(color: .white).cropped(to: image.extent)
  let sortieImg = image.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: blanc, kCIInputMaskImageKey: masque])
  guard let cgOut = ctx.createCGImage(sortieImg, from: image.extent) else { continue }
  let dst = URL(fileURLWithPath: "\(sortie)/\(url.lastPathComponent)")
  guard let d = CGImageDestinationCreateWithURL(dst as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { continue }
  var p = props; p[kCGImagePropertyOrientation] = 1; p[kCGImageDestinationLossyCompressionQuality] = 0.95
  CGImageDestinationAddImage(d, cgOut, p as CFDictionary)
  print(CGImageDestinationFinalize(d) ? "ok \(url.lastPathComponent) sujets \(Array(garder)) sur \(obs.allInstances.count)" : "écriture ratée \(url.lastPathComponent)")
}
