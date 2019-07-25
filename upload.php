<?php
/*var_dump($_FILES['file']);
die;*/
if ((($_FILES["file"]["type"] == "image/gif")||($_FILES["file"]["type"] == "image/jpeg")||($_FILES["file"]["type"] == "image/pjpeg"))
	&& ($_FILES["file"]["size"] < 104857600))
  {
  	if ($_FILES["file"]["error"] > 0)
    {
    	echo "Return Code: " . $_FILES["file"]["error"] . "<br />";
    }
  	else
    {
	    /*echo "Upload: " . $_FILES["file"]["name"] . "<br />";
	    echo "Type: " . $_FILES["file"]["type"] . "<br />";
	    echo "Size: " . ($_FILES["file"]["size"] / 1024) . " Kb<br />";
	    echo "Temp file: " . $_FILES["file"]["tmp_name"] . "<br />";*/
	    $filename = 'y'.rand(100,999).time();
    	move_uploaded_file($_FILES["file"]["tmp_name"],"upload/" . $filename . '.jpeg');
	    echo "upload/" . $filename . '.jpeg';
    }
  }
  else
  {
  	echo "Invalid file";
  }
?>