// Photo de profil carrée centrée sur le visage (tête et épaules), 800 x 800.
// Usage : avatar <sortie.jpg> <photo.jpg>
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers
let sortie = CommandLine.arguments[1], entree = CommandLine.arguments[2]
let url = URL(fileURLWithPath: entree)
guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
      let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
      let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("illisible"); exit(1) }
let orient = CGImagePropertyOrientation(rawValue: (props[kCGImagePropertyOrientation] as? UInt32) ?? 1) ?? .up
let image = CIImage(cgImage: cg).oriented(orient)
let req = VNDetectFaceRectanglesRequest()
try? VNImageRequestHandler(ciImage: image, options: [:]).perform([req])
guard let visage = (req.results ?? []).max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }) else { print("aucun visage"); exit(2) }
let E = image.extent
// boîte du visage en pixels (origine Vision en bas à gauche, comme Core Image)
let f = CGRect(x: E.minX + visage.boundingBox.minX * E.width, y: E.minY + visage.boundingBox.minY * E.height,
               width: visage.boundingBox.width * E.width, height: visage.boundingBox.height * E.height)
var cote = min(f.height * 3.0, E.width, E.height)
// le visage un peu au-dessus du centre : on montre aussi les épaules
var cadre = CGRect(x: f.midX - cote / 2, y: f.midY - cote * 0.58, width: cote, height: cote)
cadre.origin.x = max(E.minX, min(cadre.origin.x, E.maxX - cote))
cadre.origin.y = max(E.minY, min(cadre.origin.y, E.maxY - cote))
let ech = 800 / cote
let rendu = image.cropped(to: cadre).transformed(by: CGAffineTransform(translationX: -cadre.minX, y: -cadre.minY).concatenating(CGAffineTransform(scaleX: ech, y: ech)))
let ctx = CIContext()
guard let out = ctx.createCGImage(rendu, from: CGRect(x: 0, y: 0, width: 800, height: 800)),
      let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: sortie) as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { exit(3) }
CGImageDestinationAddImage(d, out, [kCGImageDestinationLossyCompressionQuality: 0.88] as CFDictionary)
print(CGImageDestinationFinalize(d) ? "ok" : "échec")
