declare module "piexifjs" {
  interface Rational {
    numerator: number;
    denominator: number;
  }

  type GPSCoordinate = [Rational, Rational, Rational];

  interface ExifIFD {
    [key: number]: any;
  }

  interface ExifData {
    "0th": ExifIFD;
    "Exif": ExifIFD;
    "GPS": ExifIFD;
    [key: string]: ExifIFD;
  }

  namespace piexif {
    const ImageIFD: Record<string, number>;
    const ExifIFD: Record<string, number>;
    const GPSIFD: Record<string, number>;
    function load(dataUrl: string): ExifData;
    function dump(exif: ExifData): string;
    function insert(exifStr: string, dataUrl: string): string;
  }

  export = piexif;
}
