// Recadre la poitrine (sous le visage) pour lire des initiales brodées. Usage : poitrine <sortie.jpg> <photo.jpg>
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
guard let v = (req.results ?? []).max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }) else { print("aucun visage"); exit(2) }
let E = image.extent
let f = CGRect(x: E.minX + v.boundingBox.minX * E.width, y: E.minY + v.boundingBox.minY * E.height, width: v.boundingBox.width * E.width, height: v.boundingBox.height * E.height)
var c = CGRect(x: f.midX - f.width * 1.7, y: f.minY - f.height * 2.3, width: f.width * 3.4, height: f.height * 2.0).intersection(E)
let ech = 480 / c.width
let rendu = image.cropped(to: c).transformed(by: CGAffineTransform(translationX: -c.minX, y: -c.minY).concatenating(CGAffineTransform(scaleX: ech, y: ech)))
guard let out = CIContext().createCGImage(rendu, from: CGRect(x: 0, y: 0, width: 480, height: c.height * ech)),
      let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: sortie) as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { exit(3) }
CGImageDestinationAddImage(d, out, [kCGImageDestinationLossyCompressionQuality: 0.9] as CFDictionary)
print(CGImageDestinationFinalize(d) ? "ok" : "échec")
