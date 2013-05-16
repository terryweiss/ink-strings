# Module: ink/strings/base64

##  ink/strings/base64

Base64 encoding and decoding for binary data and strings.

Author:

    

  * [Masanao Izumo](mailto:iz@onicos.co.jp)
  * Kris Kowal
  * Christoph Dorn
  * Hannes Wallnoefer
  * Terry Weiss
Copyright:

    

  * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
Source:

    

  * [src/base64.js](base64.js.html), line 2 

### Methods

#### <static> decode(str, encoding) -> {string|[ByteArray](ByteArray.html)}

    

Decodes a Base64 encoded string to a string or byte array.

##### Parameters:

Name Type Argument Description

`str`

String

the Base64 encoded string

`encoding`

String

<optional>

the encoding to use for the return value. Defaults to 'utf8'. Use 'raw' to get
a ByteArray instead of a string. Other valid values are 'utf8', 'ascii' and
'ucs2'.

Source:

    

  * [src/base64.js](base64.js.html), line 93 

##### Returns:

The decoded string or ByteArray

Type

     string | [ByteArray](ByteArray.html)

##### Example

    
         strings = require("ink-strings");     strings.decode( "XDc3L1tdMDk4NzQzMmZnZnN1amRuZm9za3N1d20qJl4lJCNA" );     -> '\\77/[]0987432fgfsujdnfosksuwm*&^%$#@'

#### <static> encode(str, encoding) -> {string}

    

Encode a string or binary to a Base64 encoded string

##### Parameters:

Name Type Argument Description

`str`

String | Binary

A string or binary object to encode

`encoding`

String

<optional>

Encoding to use if first argument is a string. Defaults to 'utf8'. Valid
values are 'utf8', 'ascii' and 'ucs2'.

Source:

    

  * [src/base64.js](base64.js.html), line 35 

##### Returns:

The Base64 encoded string

Type

     string

##### Example

    
         strings = require("ink-strings");     strings.encode( "\\77/[]0987432fgfsujdnfosksuwm*&^%$#@" )     ->'XDc3L1tdMDk4NzQzMmZnZnN1amRuZm9za3N1d20qJl4lJCNA'

[Index](index.html)

  * Modules
  * Classes

  * [ink/strings](strings.html)
  * [ink/strings/base64](base64.html)
  * [ink/strings/binary](binary.html)
  * [ink/strings/generators](generators.html)
  * [ink/strings/html](html.html)
  * [ink/strings/patterns](patterns.html)
  * [ink/strings/shape](shape.html)
  * [ink/strings/sprintf](sprintf.html)
  * [ink/strings/types](types.html)

  * [Binary](binary-Binary.html)
  * [ByteArray](binary-ByteArray.html)
  * [ByteString](binary-ByteString.html)

  
Copyright (C) 2013 Terry Weiss. All rights reserved.

