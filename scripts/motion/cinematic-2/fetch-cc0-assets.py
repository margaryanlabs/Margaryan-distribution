#!/usr/bin/env python3
"""Download only verified CC0 render assets for Cinematic Engine 2.0.

No commercial API tokens, user credentials or paid endpoints. Explicit manual
operation. Assets are NOT committed to the product source tree.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import urllib.request
import uuid

MODEL_ID = "76f2978d-96fe-454b-bc84-b520ebc39874"
MODEL_FILE = "c8bb11fe-f83e-4d11-8b7f-4eb11ed5ccb8"
MODEL_SHA256 = "45630e344504e720079b2e5e9258e099f8a03bac458c982a94c72737056f133e"
HDRI_URL = "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr"
HDRI_MD5 = "de3ba64222895aca876b1d1c2e0cf81a"

def get_bytes(url):
    req = urllib.request.Request(url,headers={"User-Agent":"Margaryan-Motion-Studio/2.0"})
    with urllib.request.urlopen(req,timeout=45) as response:
        return response.read()

def ensure(path, url, algorithm, digest):
    if path.is_file():
        existing=hashlib.new(algorithm,path.read_bytes()).hexdigest()
        if existing==digest:
            print("VERIFIED_CACHE",path);return
        raise RuntimeError("Existing asset checksum mismatch; refusing overwrite: "+str(path))
    raw=get_bytes(url)
    actual=hashlib.new(algorithm,raw).hexdigest()
    if actual!=digest:
        raise RuntimeError("Downloaded asset checksum mismatch; file not saved")
    path.write_bytes(raw)
    print("CC0_ASSET_VERIFIED",path,"bytes",len(raw))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--dir",default="out/cinematic-2/assets")
    args=parser.parse_args()
    dest=pathlib.Path(args.dir)
    dest.mkdir(parents=True,exist_ok=True)
    ensure(dest/"studio_small_08_1k.hdr",HDRI_URL,"md5",HDRI_MD5)
    # Resolve a public Blendkit CC0 asset; verify the author's public license.
    item=json.loads(get_bytes("https://www.blendkit.com/api/v1/assets/"+MODEL_ID+"/"))
    if not item.get("isFree") or item.get("license")!="cc_zero":
        raise RuntimeError("The chosen modern laptop is no longer published as CC0/free")
    url="https://www.blendkit.com/api/v1/downloads/"+MODEL_FILE+"/?scene_uuid="+str(uuid.uuid4())
    glb=dest/"blendkit_laptop_cc0.glb"
    if glb.is_file():
        if hashlib.sha256(glb.read_bytes()).hexdigest()!=MODEL_SHA256:
            raise RuntimeError("Cached CC0 laptop failed checksum")
        print("VERIFIED_CACHE",glb)
    else:
        link=json.loads(get_bytes(url))
        signed=link.get("filePath")
        if not isinstance(signed,str) or not signed.startswith("https://assets.blenderkit.com/"):
            raise RuntimeError("Unexpected download host; refused")
        ensure(glb,signed,"sha256",MODEL_SHA256)
    manifest={
        "source_rights":{"laptop":"Blendkit asset CC0 / Rohma Ansari",
                         "hdri":"Poly Haven studio_small_08 CC0"},
        "laptop":str(glb),"laptop_sha256":MODEL_SHA256,
        "hdri":str(dest/"studio_small_08_1k.hdr"),"hdri_md5":HDRI_MD5,
        "no_authentication_required":True,"production_approved":False
    }
    (dest/"provenance.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps(manifest,indent=2))

if __name__=="__main__":
    main()
