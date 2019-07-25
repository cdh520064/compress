# compress
移动端图片压缩上传

引入JS
------
```html
<script src="dist/jquery-1.11.2.min.js"></script>
<script src="dist/exif.js"></script>
<script src="dist/compress.js"></script>
```
调用
----
```javascript
var compressModal = new compressUpload('upload', {
  uploadUrl:'upload.php',
  limitSize: 100, //单位kb, 原图大小小于100kb时，不压缩，直接上传
  success: function(data){
      $('#uploadurl').val(data);
      $('#preview-img').append('<img src="'+data+'">');
  }
});
```
