# ink-strings #
![ink strings logo](etc/splat.png "ink!")
Part of the *ink* suite of tools

## Motivation ##
JavaScript string support isn't all that and a bag of chips. A number of libraries have been created to overcome the limitation and gaps in
the String object, but none have met all of the needs I have encountered. Also differing implementations have created some inconsistent results.
And although it is anathema to hardcore nodeistas to say this, I was spoiled by Ringo's string tools.

The purpose of the *ink-strings* library is to gather up the best of the available string libraries and edit them into a single, somewhat
cohesive whole that runs on server and client. This includes these excellent tools:
+ [http://epeli.github.io/underscore.string/](underscore.string)
+ [http://ringojs.org](RingoJS)
+ [http://www.diveintojavascript.com/projects/javascript-sprintf](sprintf)
+ [http://www.onicos.com/staff/iz/amuse/javascript/expert/base64.txt](base64)

And a few others, see the NOTICES.md file for details on the licenses for the tools being used.

## Installation ##

	npm install ink-strings

## Usage ##
From node:
	var strings = require("ink-strings");

On the web:
	Copy ...
	<script src=""></script>



## Documentation ##
*ink-strings* comes with a pretty big set of methods and a few classes. The document is broken up by category, but all methods
are published from the main `ink-strings` module.

* [http://terryweiss.github.io/ink-strings/generators.html](Generating Strings)
* [http://terryweiss.github.io/ink-strings/base64.html](Base64 Encoding/Decoding)
* [http://terryweiss.github.io/ink-strings/shape.html](Shaping and Manipulating Strings)
* [http://terryweiss.github.io/ink-strings/sprintf.html](sprintf)
* [http://terryweiss.github.io/ink-strings/tests.html](Interrogating Strings to see what they are made of)
* [http://terryweiss.github.io/ink-strings/html.html](HTML Tags)
* [http://terryweiss.github.io/ink-strings/binary.html](Binary Strings)
* [http://terryweiss.github.io/ink-strings/patterns.html](RegEx Pattern Library)

## License ##
Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

Portions covered by the Apache Licence
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.



