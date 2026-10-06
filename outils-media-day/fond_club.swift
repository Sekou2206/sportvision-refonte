// Fond du club derrière le joueur (06/10/2026) : même détourage que fond_blanc.swift, mais le joueur
// est posé sur une image de fond (aux couleurs du club, avec son écusson) au lieu d'un blanc pur.
// Usage : fond_club <fond.jpg> <dossier de sortie> photo1.jpg photo2.jpg …
// Le fond est mis à l'échelle pour couvrir la photo, centré.
// Détourage par Vision (VNGenerateForegroundInstanceMaskRequest, « détacher le sujet » de Photos),
// en ne gardant que les sujets qui recouvrent la PERSONNE détectée (VNGeneratePersonSegmentationRequest) :
// une chaise ou un pied de toile détectés comme « sujet » ne passent pas. Le masque est calculé à la
// pleine résolution de la photo ; métadonnées conservées.
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let sortie = CommandLine.arguments[2]
guard let fondSrc = CIImage(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])) else { print("fond illisible"); exit(1) }
let retrait = Double(ProcessInfo.processInfo.environment["FOND_RETRAIT"] ?? "0") ?? 0
let ctx = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])

func masquePersonne(_ handler: VNImageRequestHandler) -> CIImage? {
  let r = VNGeneratePersonSegmentationRequest(); r.qualityLevel = .accurate
  r.outputPixelFormat = kCVPixelFormatType_OneComponent8
  try? handler.perform([r])
  guard let b = r.results?.first?.pixelBuffer else { return nil }
  return CIImage(cvPixelBuffer: b)
}

for chemin in CommandLine.arguments.dropFirst(3) {
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
  var masque = CIImage(cvPixelBuffer: mb)
  // Toile de couleur (verte à Fontainebleau) : elle déteint sur le contour. FOND_RETRAIT=<pixels> rogne
  // le masque d'autant, puis l'adoucit, pour ne pas emporter ce liseré sur le nouveau fond.
  var sujet = image
  if retrait > 0 {
    // Sur une bande au bord du sujet, le vert ne dépasse plus le plus fort du rouge et du bleu : le reflet
    // de la toile disparaît, la peau, le maillot bleu et l'écusson jaune ne changent pas (leur vert est déjà dessous).
    let canal = { (v: CIVector) -> CIImage in image.applyingFilter("CIColorMatrix", parameters: [
      "inputRVector": v, "inputGVector": v, "inputBVector": v, "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1)]) }
    let plafond = canal(CIVector(x: 1, y: 0, z: 0, w: 0)).applyingFilter("CIMaximumCompositing", parameters: [kCIInputBackgroundImageKey: canal(CIVector(x: 0, y: 0, z: 1, w: 0))])
    let vert = canal(CIVector(x: 0, y: 1, z: 0, w: 0)).applyingFilter("CIMinimumCompositing", parameters: [kCIInputBackgroundImageKey: plafond])
    let zero = CIVector(x: 0, y: 0, z: 0, w: 0)
    let sansVert = image.applyingFilter("CIColorMatrix", parameters: ["inputGVector": zero])
    // L'alpha reste à 1 des deux côtés (le remettre à zéro éteindrait aussi le vert, prémultiplié), puis on le ramène à 1.
    let seulVert = vert.applyingFilter("CIColorMatrix", parameters: ["inputRVector": zero, "inputBVector": zero])
    let corrige = seulVert.applyingFilter("CIAdditionCompositing", parameters: [kCIInputBackgroundImageKey: sansVert])
      .applyingFilter("CIColorMatrix", parameters: ["inputAVector": zero, "inputBiasVector": CIVector(x: 0, y: 0, z: 0, w: 1)]).cropped(to: image.extent)
    let coeur = masque.applyingFilter("CIMorphologyMinimum", parameters: [kCIInputRadiusKey: retrait * 6])
                      .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: retrait * 2]).cropped(to: image.extent)
    sujet = image.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: corrige, kCIInputMaskImageKey: coeur])
    masque = masque.applyingFilter("CIMorphologyMinimum", parameters: [kCIInputRadiusKey: retrait])
                   .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: retrait * 0.5]).cropped(to: image.extent)
  }
  let E = image.extent
  let ech = max(E.width / fondSrc.extent.width, E.height / fondSrc.extent.height)
  let fg2 = fondSrc.transformed(by: CGAffineTransform(scaleX: ech, y: ech))
  let fond = fg2.transformed(by: CGAffineTransform(translationX: E.midX - fg2.extent.midX, y: E.midY - fg2.extent.midY)).cropped(to: E)
  let sortieImg = sujet.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: fond, kCIInputMaskImageKey: masque])
  guard let cgOut = ctx.createCGImage(sortieImg, from: image.extent) else { continue }
  let dst = URL(fileURLWithPath: "\(sortie)/\(url.lastPathComponent)")
  guard let d = CGImageDestinationCreateWithURL(dst as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { continue }
  var p = props; p[kCGImagePropertyOrientation] = 1; p[kCGImageDestinationLossyCompressionQuality] = 0.95
  CGImageDestinationAddImage(d, cgOut, p as CFDictionary)
  print(CGImageDestinationFinalize(d) ? "ok \(url.lastPathComponent) sujets \(Array(garder)) sur \(obs.allInstances.count)" : "écriture ratée \(url.lastPathComponent)")
}
