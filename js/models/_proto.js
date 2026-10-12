F.VOX.def('proto_stol',{size:[12,18,12],build(v){for(const [x,z] of [[1,1],[9,1],[1,9],[9,9]])v.box(x,0,z,x+1,7,z+1,'woodDark');v.box(0,8,0,11,9,11,'wood');v.box(1,10,1,10,10,10,'rose');v.box(0,10,10,11,17,11,'wood');v.box(2,11,10,9,15,10,'rose');}});
F.VOX.def('proto_lampe',{size:[8,16,8],build(v){v.box(2,0,2,5,0,5,'gold');v.box(3,1,3,4,9,4,'gold');v.cone(3.5,10,3.5,3.5,5,'flame');}});
