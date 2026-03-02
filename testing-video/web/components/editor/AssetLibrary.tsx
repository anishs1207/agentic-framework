'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useEditorStore, Asset } from '@/store/useEditorStore';
import { FileVideo, Music, Image as ImageIcon, Plus, PlusCircle, Type, Upload, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function AssetLibrary() {
    const { assets, addAsset, addClip, tracks, currentTime } = useEditorStore();
    const [activeTab, setActiveTab] = useState('all');

    const handleAddToTimeline = (asset: Asset) => {
        // Find appropriate track based on asset type
        let track = tracks.find(t => t.type === asset.type);
        // For video assets, use first available video track
        if (!track && asset.type === 'video') {
            track = tracks.find(t => t.type === 'video');
        }
        if (track) {
            addClip(track.id, asset, currentTime);
        }
    };

    const addTextClip = () => {
        const track = tracks.find(t => t.type === 'text');
        if (track) {
            const textAsset: Asset = {
                id: 'text-gen-' + Date.now(),
                type: 'text',
                src: '',
                name: 'Text Overlay'
            };
            addClip(track.id, textAsset, currentTime);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach((file) => {
            const url = URL.createObjectURL(file);
            const type = file.type.startsWith('image/')
                ? 'image'
                : file.type.startsWith('audio/')
                    ? 'audio'
                    : 'video';

            addAsset({
                type,
                src: url,
                name: file.name
            });
        });
    }, [addAsset]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/*': ['.mp4', '.webm', '.mov', '.avi'],
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
            'audio/*': ['.mp3', '.wav', '.ogg', '.m4a']
        }
    });

    const filteredAssets = activeTab === 'all'
        ? assets
        : assets.filter(a => a.type === activeTab);

    return (
        <div className="w-64 min-w-[240px] bg-card border-r border-border flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b border-border shrink-0">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Folder size={14} className="text-muted-foreground" />
                        Library
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1 px-2"
                        onClick={addTextClip}
                    >
                        <Type size={10} /> Text
                    </Button>
                </div>

                {/* Drop Zone */}
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDragActive
                            ? 'border-primary bg-primary/10 scale-[1.02]'
                            : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                        }`}
                >
                    <input {...getInputProps()} />
                    <Upload className={`w-6 h-6 mx-auto mb-1.5 transition-colors ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-[10px] text-muted-foreground">
                        {isDragActive ? 'Drop files here' : 'Import Media'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-3 pt-2 shrink-0">
                <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                    {['all', 'video', 'image', 'audio'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 text-[10px] py-1.5 rounded-md font-medium transition-all capitalize ${activeTab === tab
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {tab === 'all' ? 'All' : tab === 'image' ? 'Img' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Asset Grid */}
            <ScrollArea className="flex-1 p-3">
                {filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <ImageIcon size={24} className="mb-2 opacity-30" />
                        <p className="text-[10px]">No {activeTab === 'all' ? 'assets' : activeTab + 's'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {filteredAssets.map((asset) => (
                            <AssetCard
                                key={asset.id}
                                asset={asset}
                                onAdd={() => handleAddToTimeline(asset)}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Asset Count */}
            <div className="px-3 py-2 border-t border-border text-[9px] text-muted-foreground shrink-0">
                {assets.length} asset{assets.length !== 1 ? 's' : ''} imported
            </div>
        </div>
    );
}

function AssetCard({ asset, onAdd }: { asset: Asset; onAdd: () => void }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="group relative bg-muted/50 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary/50 hover:ring-primary transition-all aspect-square flex flex-col shadow-sm"
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(asset));
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onDoubleClick={onAdd}
        >
            {/* Add Button */}
            <div className={`absolute top-1 right-1 z-10 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <Button
                    size="icon"
                    variant="secondary"
                    className="h-5 w-5 rounded-full shadow-md"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAdd();
                    }}
                >
                    <PlusCircle size={10} />
                </Button>
            </div>

            {/* Preview */}
            <div className="flex-1 bg-neutral-900 flex items-center justify-center overflow-hidden">
                {asset.type === 'video' && (
                    <video
                        src={asset.src}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                    />
                )}
                {asset.type === 'image' && (
                    <img
                        src={asset.src}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                    />
                )}
                {asset.type === 'audio' && (
                    <div className="flex flex-col items-center gap-1">
                        <Music className="text-green-400" size={20} />
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-0.5 bg-green-400/60 rounded-full animate-pulse"
                                    style={{
                                        height: `${8 + Math.random() * 12}px`,
                                        animationDelay: `${i * 0.1}s`
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Name */}
            <div className="px-1.5 py-1 bg-card/80 backdrop-blur-sm">
                <p className="text-[9px] text-muted-foreground truncate font-medium">
                    {asset.name}
                </p>
            </div>

            {/* Type Badge */}
            <div className={`absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-medium uppercase ${asset.type === 'video' ? 'bg-blue-500/80 text-white' :
                    asset.type === 'image' ? 'bg-yellow-500/80 text-black' :
                        'bg-green-500/80 text-white'
                }`}>
                {asset.type.substring(0, 3)}
            </div>
        </div>
    );
}
